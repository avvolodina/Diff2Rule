import { NextResponse } from 'next/server';
import { local } from '@modules/db';
import { takeSnapshot } from '@api/infra/snapshot/common';

/**
 * Handles the POST request to take snapshots serially.
 * @param {Request} request - The incoming request object.
 * @returns {NextResponse} - The response object.
 */
export async function POST(request) {
  try {
    const { snapshotIds } = await request.json();

    if (!snapshotIds || !Array.isArray(snapshotIds) || snapshotIds.length === 0) {
      return NextResponse.json({ status: 'error', message: 'No snapshot IDs provided' }, { status: 400 });
    }

    // Check if all snapshots exist and set their status to "Queued"
    const updatePromises = snapshotIds.map(async (snapshotId) => {
      const checkSnapshotQuery = `
        SELECT id
        FROM snapshot
        WHERE id = $[snapshotId]
      `;
      const snapshotExists = await local.query(checkSnapshotQuery, { snapshotId });
      if (snapshotExists.length === 0) {
        throw new Error(`Snapshot with ID ${snapshotId} not found`);
      }

      const updateStatusQuery = `
        UPDATE snapshot
        SET status = $[status]
        WHERE id = $[snapshotId]
      `;
      await local.none(updateStatusQuery, { snapshotId, status: 'Queued' });
    });

    await Promise.all(updatePromises);

    // Take snapshots serially
    new Promise(async (resolve) => {
      for (const snapshotId of snapshotIds) {
        try {
          await takeSnapshot(snapshotId);
        } catch (error) {
          console.error(`Error taking snapshot ${snapshotId}: ${error.message}`);
        }
      }
      resolve();
    });

    return NextResponse.json({ status: 'success', message: 'Snapshots queued successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
