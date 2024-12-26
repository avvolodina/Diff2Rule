import { NextResponse } from 'next/server';
import { local } from '@modules/db';
import { getRsHandlerFunction } from '@api/infra/common';

/**
 * Handles the POST request to create and execute a rule set run.
 * @param {Request} request - The incoming request object.
 * @returns {NextResponse} - The response object.
 */
export async function POST(request) {
  // ID of the newly created run record
  let runId = null;

  try {
    // Get request parameters
    const { ruleSetId, runLabel, runNotes, rsParams } = await request.json();

    if (!ruleSetId) {
      return NextResponse.json(
        { status: 'error', message: 'Run not started. Rule set ID is required' },
        { status: 400 }
      );
    }
    if (!runLabel) {
      return NextResponse.json({ status: 'error', message: 'Run not started. Run label is required' }, { status: 400 });
    }
    if (!rsParams) {
      return NextResponse.json(
        { status: 'error', message: 'Run not started. Rule set parameters are required' },
        { status: 400 }
      );
    }

    // Create a new run record
    const createRunQuery = `
      INSERT INTO run (
        rs_id,
        args,
        label,
        notes,
        status
      )
      VALUES (
        $[ruleSetId],
        $[rsParams:json],
        $[runLabel],
        $[runNotes],
        'Created'
      )
      RETURNING id
    `;
    const createRunResult = await local.query(createRunQuery, { ruleSetId, rsParams, runLabel, runNotes });
    runId = createRunResult[0]?.id;

    // Get the rule set record to obtain handler function
    const getRuleSetQuery = `
      SELECT handler
      FROM rule_set
      WHERE id = $[ruleSetId]
    `;
    const getRuleSetResult = await local.query(getRuleSetQuery, { ruleSetId });
    const ruleSetHandler = getRuleSetResult[0]?.handler;

    // If rule set is not found, mark the run record as "Error"
    if (!ruleSetHandler) {
      updateRunRecordWithError(runId, 'Rule set not found');
      return NextResponse.json({ status: 'error', message: 'Rule set not found' }, { status: 404 });
    }

    // Mark the run record as "Executing"
    const updateRunQueryExecuting = `
      UPDATE run
      SET status = $[status]
      WHERE id = $[runId]
    `;
    await local.query(updateRunQueryExecuting, { status: 'Executing', runId });

    // Dynamically import and execute the handler function
    const handlerFunction = await getRsHandlerFunction(ruleSetHandler);
    // handlerFunction is not a Promise, so wrap it in a Promise and use existing
    // then and catch handlers
    Promise.resolve(handlerFunction(rsParams))
      .then(async (results) => {
        // On success, update the run record with the results and status "Completed"
        const updateRunQueryCompleted = `
          UPDATE run
          SET
            status = $[status],
            results = $[results:json],
            complete_ts = now()
          WHERE id = $[runId]
        `;
        await local.query(updateRunQueryCompleted, { status: 'Completed', results, runId });
      })
      .catch(async (error) => {
        updateRunRecordWithError(runId, error.message);
      });

    // Return success status
    return NextResponse.json({ status: 'success', message: 'Rule set run is executing...' }, { status: 200 });
  } catch (error) {
    // Update the run record with the error message and return an error status
    updateRunRecordWithError(runId, error.message);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

/**
 * Updates the run record with an error status and message.
 * @param {number} runId - The ID of the run record to update.
 * @param {string} errorMessage - The error message to set.
 */
function updateRunRecordWithError(runId, errorMessage) {
  const updateRunQueryError = `
    UPDATE run
    SET
      status = $[status],
      results = $[errorMessage:json]
    WHERE id = $[runId]
  `;
  return local.query(updateRunQueryError, {
    status: 'Error',
    errorMessage: { message: errorMessage },
    runId,
  });
}
