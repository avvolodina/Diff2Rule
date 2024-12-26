'use client';
import React, { useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  renderHeader,
  renderSubheader,
  renderSnapshotInfoAndStats,
  getRowId,
  defaultColDef,
  formatFieldsSubcell,
} from './diff-common';
import { cx } from 'class-variance-authority';

// Maximum length of a general variance string (for non-numeric values)
const MAX_GENERAL_VARIANCE_LEN = 10;

/**
 * Diff table visualizer component variant for system IDs.
 */
export function SystemIdDiffTable(props) {
  const props_ = { ...props };
  props_.overrides = {
    docTitle: 'System ID Diff (table)',
    title: 'System ID Diff (table)',
    headers: {
      key: 'System ID',
    },
    discrepTypes: {
      new_key_no_match: 'New key no match',
      old_key_no_match: 'Old key no match',
      field_discrepancy: 'Field discrepancy',
      full_match: 'Full match',
    },
  };

  return <GenericDiffTable {...props_} />;
}

/**
 * Renders a generic diff table visualizer component. Props are as follows:
 *   - run_results, snapshot_info: see format output by diffAsTable() in
 *     modules/handlers/visualizer/diff-ss.js
 *   - overrides: string substitutions and parameter overrides for the UI
 */
export function GenericDiffTable(props) {
  const { run_results, snapshot_info, overrides } = props;

  /**
   * AG Grid state management for expanded/collapsed cells
   */
  const [cellExpandedState, setCellExpandedState] = React.useState({});
  const getCellExpanded = (rowId, colName) => cellExpandedState[`${rowId}-${colName}`] || false;
  const setCellExpanded = (rowId, colName, value) =>
    setCellExpandedState((prev) => ({ ...prev, [`${rowId}-${colName}`]: value }));

  /**
   * Column definitions for AG Grid
   */
  const columnDefs = useMemo(() => {
    if (!run_results?.fields) {
      return [];
    }

    const keyColumns = run_results.fields.key.map((field) => ({
      headerName: `🔑 ${field}`,
      field: `key.${field}`,
      flex: 1,
      cellClass: (params) => cx(params.data.type != 'full_match' && 'bg-yellow-200/30'),
    }));

    const compColumns = run_results.fields.comp.map((field) => ({
      headerName: field,
      field: `fields.${field}`,
      flex: 1,
      autoHeight: true,
      cellStyle: {
        padding: '0',
      },
      /**
       * Renders "fields" cells. For equal cells, does not render anything. For
       * "key no match" rows renders each cell's contents highlighted in yellow,
       * either old or new, depending on the discrepancy type.  For "field
       * discrepancy" cells renders a subgrid. The subgrid has a yellow color,
       * and is sized 2x2: "Old", old_value, "New", new_value. The cell can
       * expand/collapse to show/hide the subgrid. In the collapsed state, the
       * cell displays a one-liner in a shorter format, a "variance", which is a
       * difference between two values (in case of numeric values), or a string
       * of the form old_value->new_value (in case of any other type of values).
       * By default, the subgrid is collapsed.
       */
      cellRenderer: (params) => {
        const cell = params.value;
        if (!cell) {
          return null;
        }

        const type = params.data.type;
        const valueOld = cell.old;
        const valueNew = cell.new;
        const strValueOld = formatFieldsSubcell(valueOld);
        const strValueNew = formatFieldsSubcell(valueNew);

        if (type === 'new_key_no_match') {
          return <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1">{strValueNew}</div>;
        }

        if (type === 'old_key_no_match') {
          return <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1">{strValueOld}</div>;
        }

        const isExpanded = getCellExpanded(params.node.id, field);

        /**
         * Renders a difference between two numeric values, or
         * <old_value>-><new_value> type of string, otherwise.
         */
        const renderVariance = () => {
          if (typeof valueOld === 'number' && typeof valueNew === 'number') {
            return `𝛥 = ${valueNew - valueOld}`;
          }

          const ellipsisOld = strValueOld.length > MAX_GENERAL_VARIANCE_LEN ? '...' : '';
          const ellipsisNew = strValueNew.length > MAX_GENERAL_VARIANCE_LEN ? '...' : '';
          const strOld = strValueOld.substring(0, MAX_GENERAL_VARIANCE_LEN);
          const strNew = strValueNew.substring(0, MAX_GENERAL_VARIANCE_LEN);
          return (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1">{`${strOld}${ellipsisOld} → ${strNew}${ellipsisNew}`}</div>
          );
        };

        return (
          <div
            className="cursor-pointer hover:text-blue-600"
            onClick={() => setCellExpanded(params.node.id, field, !isExpanded)}
          >
            {!isExpanded ? (
              renderVariance()
            ) : (
              <div className="grid grid-cols-[auto_1fr]">
                <div className="border-r border-b border-gray-200 px-1">Old</div>
                <div className="px-1 border-b border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap">
                  {strValueOld}
                </div>
                <div className="border-r border-gray-200 px-1">New</div>
                <div className="px-1 overflow-hidden text-ellipsis whitespace-nowrap">{strValueNew}</div>
              </div>
            )}
          </div>
        );
      },
      cellClass: (params) => {
        const hasDiscrepancy = !!params.value;
        return hasDiscrepancy ? 'bg-amber-200/30' : '';
      },
    }));

    return [
      {
        headerName: overrides?.headers?.discrepancy ?? 'Discrepancy',
        field: 'type',
        flex: 1,
        valueGetter: (params) => overrides?.discrepTypes?.[params.data.type] ?? params.data.type,
        cellClass: (params) => cx(params.data.type != 'full_match' && 'bg-yellow-200/30'),
      },
      ...keyColumns,
      ...compColumns,
    ];
  }, [cellExpandedState]);

  /**
   * Sets the document title.
   */
  useEffect(() => {
    document.title = `${overrides?.docTitle ?? 'Diff: Table View'} - Diff2Rule`;
  }, [overrides?.docTitle]);

  /**
   * MAIN RENDER
   */
  return (
    <div className="flex flex-col h-full">
      {renderHeader({ overrides, defaultTitle: 'Snapshot Diff: Table View' })}
      {renderSubheader({ run_results })}
      {renderSnapshotInfoAndStats({ run_results, snapshot_info })}

      {/* GRID */}
      <div className="flex-grow mt-4">
        <AgGridReact
          rowData={run_results.table}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          overlayNoRowsTemplate={'<span>No discrepancies to show</span>'}
          getRowId={getRowId}
        />
      </div>
    </div>
  );
}
