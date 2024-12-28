import { NextResponse } from 'next/server';
import { takeSnapshot } from '@api/infra/snapshot/common';

/**
 * Handles the GET request to take a snapshot.
 * @param {Request} request - The incoming request object.
 * @returns {NextResponse} - The response object.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const snapshotId = searchParams.get('snapshotId');

  if (!snapshotId) {
    return NextResponse.json({ status: 'error', message: 'Snapshot ID is required' }, { status: 400 });
  }

  try {
    await takeSnapshot(snapshotId);
    return NextResponse.json({ status: 'success', message: 'Snapshot taken successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
