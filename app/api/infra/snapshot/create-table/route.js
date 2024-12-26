import { NextResponse } from 'next/server';
import { local } from '@modules/db';
import { translateDdlMssqlToPg } from '@api/infra/common';

// Handles GET requests to create a snapshot table for a target query with the
// given ID
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tqId = searchParams.get('tqId');

  if (!tqId) {
    return NextResponse.json({ error: '"tqId" parameter is required' }, { status: 400 });
  }

  // Retrieve the latest DDL JSON from the history table
  const latestDdlRec = await local.one(
    `
      SELECT ddl_json
      FROM tq_ddl_history
      WHERE tq_id = $[tqId]
      ORDER BY created_ts DESC
      LIMIT 1
    `,
    { tqId }
  );

  if (!latestDdlRec) {
    return NextResponse.json(
      { status: 'error', message: 'No DDL history found for this target query' },
      { status: 404 }
    );
  }

  // Retrieve target query record details
  const tqRec = await local.one(
    `
      SELECT *
      FROM target_query
      WHERE id = $[tqId]
    `,
    { tqId }
  );
  if (!tqRec) {
    return NextResponse.json({ error: 'TQ details not found' }, { status: 404 });
  }

  // Get components for the CREATE TABLE statement
  const ssTable = tqRec.snapshot_table;
  const ddlJson = latestDdlRec.ddl_json;

  // Translate DDL JSON from SQL Server types to PostgreSQL types
  const translatedDdlJson = await translateDdlMssqlToPg(ddlJson);
  // Convert DDL JSON to a CREATE TABLE statement
  const createTableStatement = composeCreateTableStmt(ssTable, translatedDdlJson);
  console.log('createTableStatement', createTableStatement);

  // Run the CREATE TABLE statement on the local database
  try {
    await local.none(createTableStatement);
    return NextResponse.json({ status: 'success', message: 'Table created successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

/**
 * Composes a CREATE TABLE statement for snapshot table.
 *
 * @param {string} ssTable - name of the snapshot table.
 * @param {Array} ddlJson - DDL JSON containing column definitions.
 * @returns {string} CREATE TABLE statement.
 */
function composeCreateTableStmt(ssTable, ddlJson) {
  const columns = ddlJson.map(({ name, type }) => `"${name}" ${type}`).join(',\n  ');
  return `
    CREATE TABLE "${ssTable}" (
        snapshot_id int
        ,${columns}
      	,CONSTRAINT ${ssTable}_snapshot_id_fkey FOREIGN KEY (snapshot_id) REFERENCES "${local.schema}".snapshot(id)
      );
    `;
}
