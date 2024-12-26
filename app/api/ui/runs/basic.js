'use server';
import { local } from '@modules/db.js';

/**
 * Fetches all runs for the monitor.
 */
export async function runFetchAllMonitor() {
  try {
    const sqlQuery = `
      SELECT
        id,
        label,
        rs_id,
        status,
        complete_ts,
        results->>'message' AS message
      FROM run
      ORDER BY id DESC
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[runFetchAllMonitor] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Fetches all runs for the results page.
 */
export async function runFetchAllResults() {
  try {
    const sqlQuery = `
      SELECT
        id,
        label,
        notes,
        rs_id,
        complete_ts,
        results->>'message' AS message
      FROM run
      WHERE status = 'Completed'
      ORDER BY id DESC
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[runFetchAllCompleted] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Fetches all fields of a run by its ID.
 * @param {number} runId - The ID of the run to fetch.
 */
export async function getRunById(runId) {
  try {
    const sqlQuery = `
      SELECT *
      FROM run
      WHERE id = $[runId]
    `;
    const result = await local.one(sqlQuery, { runId });
    return result;
  } catch(error) {
    error.message = `[getRunById] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Updates the notes of a run by its ID.
 * @param {number} runId - The ID of the run to update.
 * @param {string} notes - The new notes to set.
 */
export async function updateRunNotes(runId, notes) {
  try {
    const sqlQuery = `
      UPDATE run
      SET notes = $[notes]
      WHERE id = $[runId]
    `;
    await local.none(sqlQuery, { notes, runId });
  } catch(error) {
    error.message = `[updateRunNotes] ${error.message}`;
    console.error(error);
    throw error;
  }
}
