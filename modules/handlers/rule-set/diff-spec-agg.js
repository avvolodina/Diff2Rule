import { local } from '@modules/db';
import { checkRequiredParam, getSnapshotTable } from '../utils';
import { getRecsetDiffTable, doGenericResultRenamesTable } from './diff-common';

/**
 * Executes a comparison between two snapshots, identifying discrepancies based
 * on key fields, returning a table format. Table columns coincide with the
 * fields in the source snapshots. Cells with discrepancies receive objects of
 * the form { old: valueA, new: valueB }. Identical cells receive null values.
 * Unmatched old or new rows receive all cells with respective "old" or "new"
 * properties set to original unmatched row cell values, while their new/old
 * counterparts are set to null.
 * @param {object} params - The parameters for the comparison.
 * @param {string} params.ssIdOld - The ID of the old snapshot.
 * @param {string} params.ssIdNew - The ID of the new snapshot.
 * @returns {object} An object containing the comparison results, a message, and
 * statistics.
 */
export async function diff(params) {
  checkRequiredParam(params, 'ssIdOld');
  checkRequiredParam(params, 'ssIdNew');
  const rsOld = await getAggRecset(params.ssIdOld);
  const rsNew = await getAggRecset(params.ssIdNew);

  const keyFields = ['Retailer'];
  const result = getRecsetDiffTable(rsOld, rsNew, keyFields);

  doGenericResultRenamesTable(result);
  return result;
}

/**
 * Retrieves a record set of a snapshot aggregated using specific rules.
 *
 * @param {number} snapshotId - The ID of the snapshot to retrieve.
 * @returns {Promise<object|undefined>} The snapshot object, or undefined if not
 * found.
 */
async function getAggRecset(snapshotId) {
  try {
    const snapshotTable = await getSnapshotTable(snapshotId);
    if (!snapshotTable) {
      throw new Error(`[getAggRecset] Snapshot table not found for snapshot ID: ${snapshotId}`);
    }

    const sqlQuery = `
      SELECT
        "Retailer",
        count(*)::int AS "Count",
        max("DateStarted") AS "DateStarted",
        max("DateFinished") AS "DateFinished",
        max("DateRefinished") AS "DateRefinished"
      FROM $[snapshotTable:name]
      WHERE snapshot_id = $[snapshotId]
      GROUP BY "Retailer"
    `;
    const result = await local.query(sqlQuery, { snapshotTable, snapshotId });
    return result;
  } catch (error) {
    error.message = `[getAggRecset] ${error.message}`;
    console.error(error);
    throw error;
  }
}
