import { NextResponse } from 'next/server';
import { remote, local } from '@modules/db';
import { getTqHandlerFunction, getTqDetails } from '@api/infra/common';

// Handles GET requests to log DDL history for a specific target query (tqId)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tqId = searchParams.get('tqId');

  if (!tqId) {
    return NextResponse.json({ error: '"tqId" parameter is required' }, { status: 400 });
  }

  const tqRec = await getTqDetails(tqId);
  if (!tqRec) {
    return NextResponse.json({ error: 'TQ details not found' }, { status: 404 });
  }

  const handlerFunction = await getTqHandlerFunction(tqRec.handler);

  // Get the query string from the handler
  const queryString = await handlerFunction();
  // Double the quotes in the query string
  const escapedQueryString = queryString.replace(/'/g, "''");

  // Run the SQL query using queryViaTabular
  const sqlQuery = `DECLARE @query nvarchar(max) = '${escapedQueryString}'; EXEC sp_describe_first_result_set @query;`;
  const result = await remote.queryViaTabular(sqlQuery);

  // Map the result into an array of objects
  const ddlJson = JSON.stringify(
    result.map((row) => ({
      name: row.name,
      type: row.system_type_name,
    }))
  );

  // Create a new DDL history record for this target query
  await local.none(
    `
      INSERT INTO tq_ddl_history (tq_id, ddl_json)
      VALUES ($[tqId], $[ddlJson])
    `,
    { tqId, ddlJson }
  );

  return NextResponse.json(
    {
      status: 'success',
      ddlJson: ddlJson,
    },
    { status: 200 }
  );
}
