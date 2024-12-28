import React from 'react';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatStringDateIso } from '@modules/utils';

/**
 * Renders the header of the diff view.
 * @param {object} props - The props object.
 * @param {object} props.overrides - The overrides object.
 * @param {string} props.defaultTitle - The default title.
 * @returns {JSX.Element} - The rendered header.
 */
export function renderHeader(props) {
  const { overrides, defaultTitle } = props;

  return (
    <>
      <h1 className="text-2xl font-bold">{overrides?.title ?? defaultTitle}</h1>
    </>
  );
}

/**
 * Renders the subheader of the diff view.
 * @param {object} props - The props object.
 * @param {object} props.run_results - The run results object.
 * @returns {JSX.Element} - The rendered subheader.
 */
export function renderSubheader(props) {
  const { run_results } = props;

  return (
    <>
      <h2 className="text-sm mb-6">
        {run_results.table?.length != 0 || run_results.compare?.length != 0 ? (
          <span className="text-yellow-500 text-lg">⚠️</span>
        ) : (
          <span className="text-green-500 text-lg">✅</span>
        )}{' '}
        {run_results.message}
      </h2>
    </>
  );
}

/**
 * Renders the snapshot info and statistics of the diff view.
 * @param {object} props - The props object.
 * @param {object} props.run_results - The run results object.
 * @param {object} props.snapshot_info - The snapshot info object.
 * @returns {JSX.Element} - The rendered snapshot info and stats.
 */
export function renderSnapshotInfoAndStats(props) {
  const { run_results, snapshot_info } = props;

  return (
    <div className="grid grid-cols-[auto_auto] gap-4">
      <div>
        {/* OLD SNAPSHOT INFO */}
        <Accordion defaultExpanded={false} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <span className="text-sm">
              <b>Old snapshot:</b> {snapshot_info.ssIdOld.ss_label}
            </span>
          </AccordionSummary>
          <AccordionDetails>
            <div className="text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
                <div className="font-bold text-right">Snapshot ID:</div>
                <div>{snapshot_info.ssIdOld.ss_id}</div>
                <div className="font-bold text-right">T Argument:</div>
                <div>{snapshot_info.ssIdOld.ss_t_arg}</div>
                <div className="font-bold text-right">Notes:</div>
                <div>{snapshot_info.ssIdOld.ss_notes}</div>
                <div className="font-bold text-right">Completed at:</div>
                <div>{formatStringDateIso(snapshot_info.ssIdOld.ss_complete_ts)}</div>
                <div className="font-bold text-right">Target Query:</div>
                <div>{snapshot_info.ssIdOld.tq_name}</div>
                <div className="font-bold text-right">Snapshot Table:</div>
                <div>{snapshot_info.ssIdOld.tq_snapshot_table}</div>
              </div>
            </div>
          </AccordionDetails>
        </Accordion>

        {/* NEW SNAPSHOT INFO */}
        <Accordion defaultExpanded={false} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <span className="text-sm">
              <b>New snapshot:</b> {snapshot_info.ssIdNew.ss_label}
            </span>
          </AccordionSummary>
          <AccordionDetails className="text-sm">
            <div className="text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
                <div className="font-bold text-right">ID:</div>
                <div>{snapshot_info.ssIdNew.ss_id}</div>
                <div className="font-bold text-right">T Argument:</div>
                <div>{snapshot_info.ssIdNew.ss_t_arg}</div>
                <div className="font-bold text-right">Notes:</div>
                <div>{snapshot_info.ssIdNew.ss_notes}</div>
                <div className="font-bold text-right">Completed at:</div>
                <div>{formatStringDateIso(snapshot_info.ssIdNew.ss_complete_ts)}</div>
                <div className="font-bold text-right">Snapshot Table:</div>
                <div>{snapshot_info.ssIdNew.tq_snapshot_table}</div>
                <div className="font-bold text-right">Target Query:</div>
                <div>{snapshot_info.ssIdNew.tq_name}</div>
              </div>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>

      <div>
        {/* STATISTICS */}
        <Accordion defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />} classes="m-0">
            <span className="text-sm">
              <b>Total discrepancies:</b> {run_results.stats.total}
            </span>
          </AccordionSummary>
          <AccordionDetails>
            <div className="text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4">
                <div className="font-bold text-right">New keys with no match:</div>
                <div>{run_results.stats.newKeyNoMatch}</div>
                <div className="font-bold text-right">Old keys with no match:</div>
                <div>{run_results.stats.oldKeyNoMatch}</div>
                <div className="font-bold text-right">Field discrepancies:</div>
                <div>{run_results.stats.fieldsDiscrepancies}</div>
              </div>
            </div>
          </AccordionDetails>
        </Accordion>
      </div>
    </div>
  );
}

/**
 * Default column definition for AG Grid
 */
export const defaultColDef = {
  resizable: true,
  sortable: true,
  filter: true,
  flex: 1,
};

/**
 *  Formats a field value for display in a subcell. Returns NULL, or
 *  formatted date string (if a valid date), or the original value.
 */
export const formatFieldsSubcell = (value) =>
  value == null ? 'NULL' : ((dateString) => (dateString == null ? value : dateString))(formatStringDateIso(value));

/**
 * Returns a unique ID for each row, based on the key field. This is required
 * by the AG Grid to properly render and manipulate the rows.
 * @param {object} params - The row parameters.
 * @returns {string} - The unique row ID.
 */
export const getRowId = (params) => JSON.stringify(params.data.key);
