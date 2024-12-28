'use server';
import { local } from '@modules/db.js';
import { unstable_cacheTag as cacheTag, revalidateTag } from 'next/cache';

// Lookback period for snapshot selection
const SNAPSHOT_SELECT_LOOKBACK_PERIOD = '45 days';

/**
 * Fetches all snapshots.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of
 * snapshot objects.
 */
export async function snapshotFetchAll() {
  revalidateTag('SnapshotSelect');

  try {
    const sqlQuery = `
      SELECT *
      FROM snapshot
      ORDER BY id DESC
    `;
    const result = await local.query(sqlQuery);
    return result;
  } catch(error) {
    error.message = `[snapshotFetchAll] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Fetches all snapshots for the select dropdown.
 * @returns {Promise<Array<object>>} A promise that resolves to an array of
 * snapshot objects with id and label.
 */
export async function snapshotFetchAllSelect() {
  // eslint-disable-next-line
  'use cache';
  cacheTag('SnapshotSelect');

  try {
    // Fetch all snapshots from 45 days ago
    const sqlQuery = `
      SELECT id, label
      FROM snapshot
      WHERE complete_ts > now() - interval $[lookbackPeriod]
      ORDER BY id DESC
    `;
    const result = await local.query(sqlQuery, { lookbackPeriod: SNAPSHOT_SELECT_LOOKBACK_PERIOD });
    return result;
  } catch(error) {
    error.message = `[snapshotFetchAllSelect] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Creates a new snapshot.
 * @param {object} values - The values for the new snapshot.
 * @param {string} values.label - The label of the snapshot.
 * @param {number} values.tq_id - The target query id of the snapshot.
 * @param {string} values.notes - The notes of the snapshot.
 * @param {string} values.t_arg - The t_arg of the snapshot.
 * @param {string} values.status - The status of the snapshot.
 * @returns {Promise<number>} A promise that resolves to the id of the new
 * snapshot.
 */
export async function snapshotCreate(values) {
  revalidateTag('SnapshotSelect');

  try {
    const sqlQuery = `
      INSERT INTO snapshot (
        label,
        tq_id,
        notes,
        t_arg,
        status
      ) VALUES (
        $[label],
        $[tq_id],
        $[notes],
        $[t_arg],
        $[status]
      )
      RETURNING id
    `;

    const result = await local.query(sqlQuery, values);
    return result[0]?.id;
  } catch(error) {
    error.message = `[snapshotCreate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Updates an existing snapshot.
 * @param {object} values - The values to update the snapshot with.
 * @param {number} values.id - The id of the snapshot to update.
 * @param {string} values.label - The new label of the snapshot.
 * @param {number} values.tq_id - The new target query id of the snapshot.
 * @param {string} values.notes - The new notes of the snapshot.
 * @returns {Promise<void>} A promise that resolves when the snapshot is
 * updated.
 */
export async function snapshotUpdate(values) {
  revalidateTag('SnapshotSelect');

  try {
    const sqlQuery = `
      UPDATE snapshot
      SET label = $[label],
          tq_id = $[tq_id],
          notes = $[notes]
      WHERE id = $[id]
    `;

    await local.none(sqlQuery, values);
  } catch(error) {
    error.message = `[snapshotUpdate] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Deletes a snapshot.
 * @param {number} id - The id of the snapshot to delete.
 * @returns {Promise<void>} A promise that resolves when the snapshot is
 * deleted.
 */
export async function snapshotDelete(id) {
  revalidateTag('SnapshotSelect');

  try {
    const sqlQuery = `
      DELETE FROM snapshot
      WHERE id = $[id]
    `;
    await local.none(sqlQuery, { id });
  } catch(error) {
    error.message = `[snapshotDelete] ${error.message}`;
    console.error(error);
    throw error;
  }
}

/**
 * Gets extended information for a single snapshot.
 * @param {number} snapshotId - The id of the snapshot to get info for.
 * @returns {Promise<object>} A promise that resolves to the snapshot info
 * object.
 */
export async function getSnapshotInfo(snapshotId) {
  try {
    const sqlQuery = `
      SELECT
        ss.id AS ss_id,
        ss.label AS ss_label,
        ss.notes AS ss_notes,
        ss.t_arg AS ss_t_arg,
        ss.complete_ts AS ss_complete_ts,
        tq.id AS tq_id,
        tq.name AS tq_name,
        tq.snapshot_table AS tq_snapshot_table,
        tq.notes AS tq_notes
      FROM snapshot ss
        JOIN target_query tq ON ss.tq_id = tq.id
      WHERE ss.id = $[snapshotId]
    `;
    const result = await local.one(sqlQuery, { snapshotId });
    return result;
  } catch(error) {
    error.message = `[getSnapshotInfo] ${error.message}`;
    console.error(error);
    throw error;
  }
}
