import { local } from '@modules/db.js';

/**
 * Retrieves the snapshot table name for a given snapshot ID.
 *
 * @param {number} snapshotId - The ID of the snapshot.
 * @returns {Promise<string|undefined>} The name of the snapshot table, or
 * undefined if not found.
 */
export async function getSnapshotTable(snapshotId) {
  try {
    const sqlQuery = `
      SELECT tq.snapshot_table
      FROM snapshot s
        JOIN target_query tq ON s.tq_id = tq.id
      WHERE s.id = $[snapshotId]
    `;
    const result = await local.query(sqlQuery, { snapshotId });
    return result[0]?.snapshot_table;
  } catch (error) {
    error.message = `[getSnapshotTable] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Retrieves snapshot record set by its ID.
 *
 * @param {number} snapshotId - The ID of the snapshot to retrieve.
 * @returns {Promise<object|undefined>} The snapshot object, or undefined if not
 * found.
 */
export async function getSnapshot(snapshotId) {
  try {
    const snapshotTable = await getSnapshotTable(snapshotId);
    if(!snapshotTable) {
      throw new Error(`[getSnapshot] Snapshot table not found for snapshot ID: ${snapshotId}`);
    }

    const sqlQuery = `
      SELECT *
      FROM $[snapshotTable:name]
      WHERE snapshot_id = $[snapshotId]
    `;
    const result = await local.query(sqlQuery, {snapshotTable, snapshotId});
    return result;
  } catch (error) {
    error.message = `[getSnapshot] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Checks if a parameter is defined and not empty.
 * @param {Object} params  Parameters object.
 * @param {string} paramName  Parameter name.
 * @throws {Error} If the parameter is not found or empty.
 */
export function checkRequiredParam(params, paramName) {
  if (params[paramName] == null) {
    throw new Error(`Parameter "${paramName}" is required`);
  }
}

/**
 * Splits a string of fields names separated by commas or spaces into an array
 * of fields names. Field names are trimmed and empty strings are removed. At
 * least an empty array is returned if the input is falsy.
 * @param {string} fieldList - A string of fields separated by commas or spaces.
 * @returns {string[]} An array of field names.
 */
export function splitFieldList(fieldList) {
  if (!fieldList) {
    return [];
  }
  
  return fieldList
    .split(/[ ,]+/)
    .map((field) => field.trim())
    .filter((field) => field !== '');
}

/**
 * Checks for a required parameter, and if present, splits it into a list of fields.
 * @param {object} params - The parameters object.
 * @param {string} paramName - The name of the parameter to check.
 * @param {boolean} isRequired - Whether the parameter is required.
 * @returns {string[]} An array of fields, or an empty array if not required and not present.
 * @throws {Error} If the parameter is required and not present, or if the parameter is present but empty.
 */
export function checkGetFieldList(params, paramName, isRequired = true) {
  if (isRequired) {
    checkRequiredParam(params, paramName);
  }

  const fieldList = params[paramName];
  if (!fieldList) {
    return [];
  }

  const fields = splitFieldList(fieldList);
  if (isRequired && fields.length === 0) {
    throw new Error(`No fields specified in "${paramName}"`);
  }

  return fields;
}

/**
 * Checks for a required parameter, and if present, retrieves the snapshot record set.
 * @param {object} params - The parameters object.
 * @param {string} paramName - The name of the parameter to check.
 * @param {boolean} isRequired - Whether the parameter is required.
 * @returns {object} The snapshot record set.
 * @throws {Error} If the parameter is required and not present.
 */
export async function checkGetSnapshotRecset(params, paramName, isRequired = true) {
  if (isRequired) {
    checkRequiredParam(params, paramName);
  }

  const ssId = params[paramName];
  if (!ssId) {
    return null;
  }

  return await getSnapshot(ssId);
}
