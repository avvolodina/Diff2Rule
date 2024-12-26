'use client';
import React, { useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { renderHeader, renderSubheader, renderSnapshotInfoAndStats, getRowId, defaultColDef, formatFieldsSubcell } from './diff-common';
import { cx } from 'class-variance-authority';

/**
 * Diff list visualizer component variant for system IDs.
 */
export function SystemIdDiffList(props) {
  const props_ = { ...props };
  props_.overrides = {
    docTitle: 'System ID Diff (detailed)',
    title: 'System ID Diff (detailed)',
    headers: {
      key: 'System ID',
    },
    discrepTypes: {
      new_key_no_match: 'New key no match',
      old_key_no_match: 'Old key no match',
      field_discrepancy: 'Field discrepancy',
    },
  };

  return <GenericDiffList {...props_} />;
}

/**
 * Renders a generic diff list visualizer component. Props are as follows:
 *   - run_results, snapshot_info: see format output by diffAsList() in
 *     modules/handlers/visualizer/diff-ss.js
 *   - overrides: string substitutions and parameter overrides for the UI
 */
export function GenericDiffList(props) {
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
  const columnDefs = useMemo(
    () => [
      {
        headerName: overrides?.headers?.discrepancy ?? 'Discrepancy',
        field: 'type',
        flex: 1,
        valueGetter: (params) => overrides?.discrepTypes?.[params.data.type] ?? params.data.type,
      },
      {
        headerName: overrides?.headers?.key ?? 'Key',
        field: 'key',
        flex: 2,
        valueFormatter: 'JSON.stringify(value)',
        /**
         * Renders a subgrid inside a "key" cell. Each row has columns: Field
         * name, Value. The cell can expand/collapse to show/hide the subgrid.
         * In the collapsed state, the cell displays a one-liner in a shorter
         * format. By default, the subgrid is collapsed. The cell can expand
         * only if there are more than one field names.
         */
        cellRenderer: (params) => {
          const keys = params.value;
          if (!keys || Object.keys(keys).length === 0) {
            return null;
          }

          const fieldNames = run_results.fields.key.filter((fieldName) => !!keys[fieldName]);
          const isExpanded = getCellExpanded(params.node.id, 'key');
          const shouldExpand = fieldNames.length > 1;

          return (
            <div
              className={cx(shouldExpand && 'cursor-pointer')}
              onClick={shouldExpand ? () => setCellExpanded(params.node.id, 'key', !isExpanded) : undefined}
            >
              {!isExpanded || !shouldExpand ? (
                <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1">
                  <div
                    className={cx('grid grid-cols-[minmax(4em,1fr)_4em] gap-1', shouldExpand && 'hover:text-blue-600')}
                  >
                    <span className="max-w-min">
                      {shouldExpand && <>{formatFieldsSubcell(fieldNames[0])}:&emsp;</>}
                      {formatFieldsSubcell(keys[fieldNames[0]])}
                    </span>
                    {shouldExpand && <span className="justify-self-end underline decoration-dotted">more &raquo;</span>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[2fr_1fr] hover:text-blue-600">
                  {fieldNames.map((fieldName, fieldIdx) => (
                    <React.Fragment key={`${params.node.id}-${fieldName}`}>
                      {renderFieldsSubcell(fieldIdx, fieldName)}
                      {renderFieldsSubcell(fieldIdx, keys[fieldName], false)}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        },
      },
      {
        headerName: overrides?.headers?.fields ?? 'Fields',
        field: 'fields',
        flex: 2,
        cellStyle: {
          padding: '0',
        },
        valueFormatter: 'JSON.stringify(value)',
        /**
         * Renders a subgrid inside a "fields" cell. The subgrid has a warning
         * color, and each row has columns: Field name, Value A, Value B. The
         * cell can expand/collapse to show/hide the subgrid. In the collapsed
         * state, the cell displays a one-liner in a shorter format. By default,
         * the subgrid is collapsed. The cell can expand only if there are more
         * than one field names.
         */
        cellRenderer: (params) => {
          const fields = params.value;
          if (!fields || Object.keys(fields).length === 0) {
            return null;
          }

          const fieldNames = run_results.fields.comp.filter((fieldName) => !!fields[fieldName]);
          const isExpanded = getCellExpanded(params.node.id, 'fields');
          const shouldExpand = fieldNames.length > 1;

          return (
            <div
              className={cx('bg-amber-200/25', shouldExpand && 'cursor-pointer')}
              onClick={shouldExpand ? () => setCellExpanded(params.node.id, 'fields', !isExpanded) : undefined}
            >
              {!isExpanded || !shouldExpand ? (
                <div className="overflow-hidden text-ellipsis whitespace-nowrap px-1">
                  <div
                    className={cx('grid grid-cols-[minmax(4em,1fr)_4em] gap-1', shouldExpand && 'hover:text-blue-600')}
                  >
                    <span className="max-w-min">
                      {formatFieldsSubcell(fieldNames[0])}
                      {':'}&emsp;
                      {formatFieldsSubcell(fields[fieldNames[0]]?.valueA)}
                      {' → '}
                      {formatFieldsSubcell(fields[fieldNames[0]]?.valueB)}
                    </span>
                    {shouldExpand && <span className="justify-self-end underline decoration-dotted">more &raquo;</span>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-[2fr_1fr_1fr] hover:text-blue-600">
                  {fieldNames.map((fieldName, fieldIdx) => {
                    const field = fields[fieldName];

                    return (
                      <React.Fragment key={`${params.node.id}-${fieldName}`}>
                        {renderFieldsSubcell(fieldIdx, fieldName)}
                        {renderFieldsSubcell(fieldIdx, field?.valueA)}
                        {renderFieldsSubcell(fieldIdx, field?.valueB, false)}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        },
        autoHeight: true,
      },
    ],
    [cellExpandedState]
  );

  /**
   *  Renders "fields" subcell.
   *  @param {number} idx - The index of the field.
   *  @param {*} value - The value of the field.
   *  @param {boolean} [hasBorderRight] - Whether to add a border to the right. Defaults to true.
   *  @returns {React.ReactNode} - The rendered cell.
   */
  const renderFieldsSubcell = (idx, value, hasBorderRight = true) => (
    <div
      className={cx(
        idx != 0 && 'border-t',
        'px-1',
        hasBorderRight && 'border-r',
        'border-gray-200 overflow-hidden text-ellipsis whitespace-nowrap'
      )}
    >
      {formatFieldsSubcell(value)}
    </div>
  );

  /**
   * Sets the document title.
   */
  useEffect(() => {
    document.title = `${overrides?.docTitle ?? 'Diff: List View'} - Diff2Rule`;
  }, [overrides?.docTitle]);

  /**
   * MAIN RENDER
   */
  return (
    <div className="flex flex-col h-full">
      {renderHeader({ overrides, defaultTitle: 'Snapshot Diff: List View' })}
      {renderSubheader({ run_results })}
      {renderSnapshotInfoAndStats({ run_results, snapshot_info })}

      {/* GRID */}
      <div className="flex-grow mt-4">
        <AgGridReact
          rowData={run_results.compare}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          overlayNoRowsTemplate={'<span>No discrepancies to show</span>'}
          getRowId={getRowId}
        />
      </div>
    </div>
  );
}
