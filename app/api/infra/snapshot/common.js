import { remote, local } from '@modules/db';
import { getTqHandlerFunction, getTqDetails, translateDdlMssqlToPg } from '@api/infra/common';
import { getTmpFilename } from '@modules/utils-server.js';
import fs from 'fs';

/**
 * Takes a snapshot.
 * @param {string} snapshotId - The ID of the snapshot to take.
 */
export async function takeSnapshot(snapshotId) {
  try {
    // Update the snapshot record with the Processing status and current
    // timestamp, get the target query ID
    const updateSnapshotQuery = `
      UPDATE snapshot
      SET status = $[status]
      WHERE id = $[snapshotId]
      RETURNING tq_id, t_arg
    `;
    const updateSnapshotResult = await local.query(updateSnapshotQuery, { snapshotId, status: 'Processing' });
    const { tq_id: targetQueryId, t_arg: tArg } = updateSnapshotResult[0] || {};
    if (!targetQueryId) {
      throw new Error('Target query ID not found for the given snapshot ID');
    }

    // Get the target query details
    const tqDetails = await getTqDetails(targetQueryId);
    if (!tqDetails) {
      throw new Error('Target query details not found');
    }

    // Get the latest DDL JSON from history
    const ddlHistoryQuery = `
    SELECT ddl_json
    FROM tq_ddl_history
    WHERE tq_id = $[targetQueryId]
    ORDER BY created_ts DESC LIMIT 1
  `;
    const ddlHistoryResult = await local.query(ddlHistoryQuery, { targetQueryId });
    const ddlJson = ddlHistoryResult[0]?.ddl_json;
    if (!ddlJson) {
      throw new Error('DDL JSON not found for the target query ID');
    }
    const translatedDdlJson = await translateDdlMssqlToPg(ddlJson);

    // Dynamically import and execute the handler function
    const handlerFunction = await getTqHandlerFunction(tqDetails.handler);
    const query = await handlerFunction({ tArg });

    // Run the query on the remote database
    const queryResult = await remote.query(query);

    // Create a temporary file
    const tmpFile = getTmpFilename({ postfix: '.csv' });
    console.log('tmpFile', tmpFile);

    // Prepare a proper CSV content with the header row
    const headerRow = `snapshot_id,${translatedDdlJson.map(({ name }) => name).join(',')}\n`;
    const dataRows = queryResult
      .map((row) => {
        const values = translatedDdlJson.map((col) => row[col.name]);

        return `${snapshotId},${values
          .map((value) => {
            if (value == null) {
              return '';
            }

            const strValue = String(value);
            if (strValue === '') {
              return '""';
            }

            if (/[,"\n\r]/.test(strValue)) {
              return `"${strValue.replace(/["\\]/g, '\\$&')}"`;
            }

            return strValue;
          })
          .join(',')}\n`;
      })
      .join('');

    // Write CSV content to the temp file
    fs.writeFileSync(tmpFile, headerRow + dataRows);

    // Construct the COPY command
    const copyCommand = `
      COPY $[schema:name].$[snapshotTable:name]
      FROM $[tmpFile]
      WITH (FORMAT CSV, HEADER, ESCAPE $[escape]);
  `;

    // Execute the COPY command
    await local.none(copyCommand, {
      schema: local.schema,
      snapshotTable: tqDetails.snapshot_table,
      tmpFile,
      escape: '\\',
    });

    // Delete the temporary file
    fs.unlinkSync(tmpFile);

    // Update the snapshot record with the status "Completed" and the current
    // timestamp
    const updateSnapshotQueryCompleted = `
    UPDATE snapshot
    SET
      status = $[status],
      complete_ts = now()
    WHERE id = $[snapshotId]
  `;
    await local.none(updateSnapshotQueryCompleted, { snapshotId, status: 'Completed' });
  } catch (error) {
    // Update the snapshot record with the status "Error"
    const updateSnapshotQueryError = `
      UPDATE snapshot
      SET status = $[status]
      WHERE id = $[snapshotId]
    `;
    await local.none(updateSnapshotQueryError, { snapshotId, status: 'Error' });
    throw error;
  }
}
