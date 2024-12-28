'use server';
import { local } from '@modules/db';

/**
 * Retrieves target query record details from the database.
 *
 * @param {string} tqId - The ID of the target query.
 * @returns {Promise<Object>} A promise that resolves to the target query record details.
 */
export async function getTqDetails(tqId) {
  const tqRec = await local.one(
    `
       SELECT *
       FROM target_query
       WHERE id = $[tqId]
     `,
    { tqId }
  );

  return tqRec;
}

/**
 * Dynamically imports a handler function from a specified directory based on
 * the provided handler path.
 *
 * @param {string} handlerDir - The directory containing the handler function.
 * @param {string} handlerPath - The path to the handler function in the format
 * 'sourceFile.functionName'.
 * @returns {Promise<Function>} A promise that resolves to the imported handler
 * function.
 */
async function getHandlerFunction(handlerDir, handlerPath) {
  const [sourceFile, functionName] = handlerPath.split('.');
  const handlerModule = await import(`@handlers/${handlerDir}/${sourceFile}`);
  return handlerModule[functionName];
}

/**
 * Dynamically imports a target query handler function based on the provided handler path.
 *
 * @param {string} handlerPath - The path to the handler function in the format 'sourceFile.functionName'.
 * @returns {Promise<Function>} A promise that resolves to the imported handler function.
 */
export async function getTqHandlerFunction(handlerPath) {
  return getHandlerFunction('target-query', handlerPath);
}

/**
 * Dynamically imports a rule set handler function based on the provided handler path.
 *
 * @param {string} handlerPath - The path to the handler function in the format 'sourceFile.functionName'.
 * @returns {Promise<Function>} A promise that resolves to the imported handler function.
 */
export async function getRsHandlerFunction(handlerPath) {
  return getHandlerFunction('rule-set', handlerPath);
}

// Map: Native SQL Server Type -> PostgreSQL Type (only name differences mapped)
const mssqlPgDataTypeMap = {
  //sort these by name
  bigint: 'bigint',
  binary: 'bytea',
  bit: 'bool',
  char: 'char',
  datetime: 'timestamp',
  datetime2: 'timestamp',
  datetimeoffset: 'timestamptz',
  float: 'double precision',
  image: 'bytea',
  int: 'integer',
  nchar: 'char',
  ntext: 'text',
  nvarchar: 'varchar',
  smalldatetime: 'timestamp',
  smallmoney: 'money',
  tinyint: 'smallint',
  uniqueidentifier: 'uuid',
  varbinary: 'bytea',
};

/**
 * Translates DDL JSON from SQL Server types to PostgreSQL types.
 *
 * @param {Array} ddlJson - DDL JSON containing column definitions.
 * @returns {Promise<Array>} Translated DDL JSON.
 */
export async function translateDdlMssqlToPg(ddlJson) {
  return ddlJson.map((col) => {
    const pgType = mssqlPgDataTypeMap[col.type] || col.type;
    return { ...col, type: pgType };
  });
}
