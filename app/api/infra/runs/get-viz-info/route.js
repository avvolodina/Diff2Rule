import { NextResponse } from 'next/server';
import { local } from '@modules/db';
import { getSnapshotInfo } from '@api/ui/snapshots/basic';

/**
 * Fetches the run information associated with a run with the specified ID
 * (runId), that can be used by a visualizer.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: '"runId" parameter is required' }, { status: 400 });
  }

  try {
    const sqlQueryRunInfo = `
      SELECT
        rs.id AS rs_id,
        rs.name AS rs_name,
        rs.params AS rs_params,
        rs.visualizer AS rs_visualizer,
        r.id AS run_id,
        r.label AS run_label,
        r.notes AS run_notes,
        r.status AS run_status,
        r.args AS run_args,
        r.complete_ts AS run_complete_ts,
        r.results AS run_results
      FROM run r
        JOIN rule_set rs ON r.rs_id = rs.id
      WHERE r.id = $[runId]
    `;
    const runInfo = await local.one(sqlQueryRunInfo, { runId });

    // Augment the run info object with some info about snapshot params, if any
    if(runInfo.rs_params && runInfo.run_args) {
      runInfo.snapshot_info = {};
      await Promise.all(runInfo.rs_params.map(async (param) => {
        if (param.type !== 'Snapshot' || !runInfo.run_args[param.name]) return;

        const snapshotId = runInfo.run_args[param.name];
        const snapshotInfo = await getSnapshotInfo(snapshotId);
        runInfo.snapshot_info[param.name] = snapshotInfo;
      }));
    }

    return NextResponse.json({ status: 'success', runInfo }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
