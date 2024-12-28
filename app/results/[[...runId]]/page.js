'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { runFetchAllResults, updateRunNotes } from '@api/ui/runs/basic';
import { ruleSetFetchAllSelect } from '@api/ui/rule-sets/basic';
import { useSnackbar } from '@components/SnackbarContext';
import { useDialogs } from '@toolpad/core/useDialogs';
import { Stack, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageviewIcon from '@mui/icons-material/Pageview';
import { useRouter, useSearchParams } from 'next/navigation';
import LinebreaksToBrCellRenderer from '@components/LinebreaksToBrCellRenderer';
import { formatDateIso } from '@modules/utils';

/**
 * Main component for the Results page.
 * Displays a grid of runs and provides functionality to manage them.
 */
const ResultsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showSuccess, showWarning, showError, showInfo } = useSnackbar();
  const dialogs = useDialogs();
  const gridRef = useRef(null);
  const gridApi = gridRef?.current?.api;
  const [rsCache, setRsCache] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Defines the columns for the AgGrid table.
   */
  const columnDefs = useMemo(
    () => [
      { field: 'label', headerName: 'Label', editable: false, sortable: true, filter: true, flex: 2 },
      {
        field: 'rs_id',
        headerName: 'Rule Set',
        editable: false,
        sortable: true,
        filter: true,
        valueFormatter: (params) => {
          const rsCached = rsCache.find((rs) => rs.id == params.value);
          return rsCached?.name || '< Unknown >';
        },
      },
      {
        field: 'notes',
        headerName: 'Notes',
        cellClass: 'text-sm',
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
          rows: 8,
          cols: 50,
          maxLength: 4000,
        },
        autoHeight: true,
        wrapText: true,
        editable: true,
        cellRenderer: LinebreaksToBrCellRenderer,
        flex: 2,
      },
      {
        field: 'complete_ts',
        headerName: 'Completed At',
        editable: false,
        sortable: true,
        filter: true,
        valueFormatter: (params) => formatDateIso(params.value),
      },
      { field: 'message', headerName: 'Message', editable: false, sortable: true, filter: true, flex: 2 },
      {
        headerName: 'Tools',
        filter: false,
        sortable: false,
        editable: false,
        cellRenderer: (params) => (
          <div className="flex items-center justify-center h-full">
            <IconButton
              title="View results"
              className="rounded bg-green-500 hover:bg-green-700 p-0.5"
              onClick={() => onResultsBtnClick(params.data)}
            >
              <PageviewIcon className="text-white text-sm" />
            </IconButton>
          </div>
        ),
        flex: 0.5,
      },
    ],
    [rsCache]
  );

  /**
   * Defines the default column properties for the AgGrid table.
   */
  const defaultColDef = useMemo(() => {
    return {
      filter: true,
      sortable: true,
      editable: false,
      flex: 1,
    };
  }, []);

  /**
   * Initially fetches all runs from the database.
   */
  useEffect(() => {
    const fetchData = async () => {
      const [runs, ruleSets] = await Promise.all([runFetchAllResults(), ruleSetFetchAllSelect()]);
      setRowData(runs);
      setRsCache(ruleSets);
      setLoading(false);
    };

    fetchData();
  }, []);

  /**
   * Handles the "Results" button click.
   */
  const onResultsBtnClick = useCallback((runData) => {
    const runId = runData.id;
    window.open(`/viz-host/${runId}`, '_blank');
  }, []);

  /**
   * Handles the "Refresh" button click.
   * Refreshes the grid with the latest data from the database.
   */
  const onRefreshBtnClick = useCallback(() => {
    runFetchAllResults()
      .then((data) => {
        setRowData(data);
        showInfo('Run results refreshed successfully');
        console.info('Run results refreshed successfully');
      })
      .catch((error) => {
        console.error('Error fetching runs:', error);
        showError(`Error fetching runs: ${error.message}`);
      });
  }, []);

  /**
   * Handles the cell value change event in the grid. Updates the run in
   * the database with the new values.
   * @param {Object} event - The event object containing the updated cell data.
   */
  const onCellValueChanged = useCallback(
    async (event) => {
      try {
        await updateRunNotes(event.data.id, event.value);
        showSuccess('Run updated successfully');
      } catch (error) {
        showError(`Error updating run: ${error.message}`);
      }
    },
    [showSuccess, showError]
  );

  useEffect(() => {
    const runId = searchParams.get('runId');
    if (runId) {
      // Mock the runData object for onResultsBtnClick
      onResultsBtnClick({ id: runId });
    }
  }, [searchParams, onResultsBtnClick]);

  return (
    <div className="flex flex-col h-full">
      <title>Results - Diff2Rule</title>
      <h1 className="text-2xl font-bold">Results</h1>
      <h2 className="text-md">Analyze results from completed runs</h2>

      <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
        <IconButton color="primary" onClick={onRefreshBtnClick} size="small" title="Refresh">
          <RefreshIcon />
        </IconButton>
      </Stack>

      <div className="flex-grow">
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          animateRows={true}
          singleClickEdit={true}
          stopEditingWhenCellsLoseFocus={true}
          getRowId={(params) => params.data.id?.toString()}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
    </div>
  );
};

export default ResultsPage;
