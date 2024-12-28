'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { snapshotFetchAll, snapshotCreate, snapshotDelete, snapshotUpdate } from '@api/ui/snapshots/basic';
import { targetQueryFetchAllSelect } from '@api/ui/target-queries/basic';
import { useSnackbar } from '@components/SnackbarContext';
import { useDialogs } from '@toolpad/core/useDialogs';
import { Button, Stack, IconButton, Menu, MenuItem, ButtonGroup } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { DateTime } from 'luxon';
import { formatDateIso, formatDateIsoShort } from '@modules/utils';
import StatusCellRenderer from '@components/StatusCellRenderer';
import LinebreaksToBrCellRenderer from '@components/LinebreaksToBrCellRenderer';
import CreateTemporalBatchDialog from '@components/CreateTemporalBatchDialog';

/**
 * Main component for the Snapshots page.
 * Displays a grid of snapshots and provides functionality to manage them.
 */
export default function SnapshotsPage() {
  const { showSuccess, showWarning, showError, showInfo } = useSnackbar();
  const dialogs = useDialogs();
  const gridRef = useRef(null);
  const gridApi = gridRef?.current?.api;
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([
    { field: 'label', headerName: 'Label', editable: true },
    {
      field: 'tq_id',
      headerName: 'Target Query',
      editable: true,
      cellEditor: 'agSelectCellEditor',
    },
    {
      field: 't_arg',
      headerName: 'T Argument',
      editable: false,
    },
    {
      field: 'notes',
      headerName: 'Notes',
      editable: true,
      cellClass: 'text-sm',
      cellEditor: 'agLargeTextCellEditor',
      cellEditorPopup: true,
      cellEditorParams: {
        rows: 8,
        cols: 50,
        maxLength: 4000,
      },
      autoHeight: true,
      cellRenderer: LinebreaksToBrCellRenderer,
      flex: 2,
    },
    {
      field: 'complete_ts',
      headerName: 'Completed',
      editable: false,
      valueFormatter: (params) => formatDateIso(params.value),
    },
    {
      field: 'status',
      headerName: 'Status',
      editable: false,
      flex: 1,
      autoHeight: true,
      cellRenderer: StatusCellRenderer,
    },
    {
      headerName: 'Tools',
      filter: false,
      sortable: false,
      editable: false,
      cellRenderer: (params) => (
        <div className="flex items-center justify-center h-full">
          <IconButton
            title="Make a snapshot"
            className="rounded bg-green-500 hover:bg-green-700 p-0.5"
            onClick={() => onMakeSnapshotClick(params.data)}
            disabled={params.data.status !== 'Created'}
          >
            <PlayArrowIcon className="text-white text-sm" />
          </IconButton>
        </div>
      ),
      flex: 0.5,
    },
  ]);
  const defaultColDef = useMemo(() => {
    return {
      filter: true,
      sortable: true,
      editable: true,
      flex: 1,
    };
  }, []);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDeleteEnabled, setIsDeleteEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tqMap, setTqMap] = useState({});
  const [anchorEl, setAnchorEl] = useState(null);
  const [isTemporalBatchDialogOpen, setIsTemporalBatchDialogOpen] = useState(false);
  const isNewBtnMenuOpen = Boolean(anchorEl);

  /**
   * Initially fetches all snapshots from the database.
   */
  useEffect(() => {
    snapshotFetchAll()
      .then((data) => {
        setRowData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching snapshots:', error);
        showError(`Error fetching snapshots: ${error.message}`);
        setLoading(false);
      });
  }, []);

  /**
   * Fetches target queries and sets tqMap on component mount.
   */
  useEffect(() => {
    const fetchTargetQueries = async () => {
      try {
        const tqData = await targetQueryFetchAllSelect();
        const tqMap = Object.fromEntries(tqData.map((tq) => [tq.id, tq.name]));
        setTqMap(tqMap);
      } catch (error) {
        showError(`Error fetching target queries: ${error.message}`);
      }
    };

    fetchTargetQueries();
  }, []);

  /**
   * Augments the Target Query column display and the dropdown editor with
   * target query names.
   */
  useEffect(() => {
    if (!tqMap || Object.keys(tqMap).length === 0) {
      return;
    }

    const colIdx = columnDefs.findIndex((col) => col.field == 'tq_id');
    if (colIdx === -1) {
      console.error('Column "tq_id" not found in columnDefs');
      return;
    }

    setColumnDefs([
      // Keep other columns unchanged
      ...columnDefs.slice(0, colIdx),
      {
        ...columnDefs[colIdx],
        cellEditorParams: {
          values: Object.keys(tqMap),
        },
        refData: tqMap,
        comparator: (valueA, valueB) => {
          const cmp = tqMap[valueA].localeCompare(tqMap[valueB]);
          return cmp;
        },
      },
      // Keep other columns unchanged
      ...columnDefs.slice(colIdx + 1),
    ]);
  }, [tqMap]);

  /**
   * Handles the "Make Snapshot" button click.  Calls the Take Snapshot
   * endpoint.
   * @param {Object} snapshotData - Details of the snapshot to be taken.
   */
  const onMakeSnapshotClick = useCallback(
    async (snapshotData) => {
      try {
        const response = await fetch(`/api/infra/snapshot/take?snapshotId=${snapshotData.id}`);
        const data = await response.json();
        if (data.status === 'success') {
          showSuccess(`Snapshot "${snapshotData.label}" taken successfully`);
        } else {
          showError(`Failed to take snapshot "${snapshotData.label}": ${data.message}`);
        }
      } catch (error) {
        showError(`Error taking snapshot "${snapshotData.label}": ${error.message}`);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Handles the "New" button click.
   * Creates a new snapshot with empty values, adds it to the grid, and enters edit mode.
   */
  const onNewBtnClick = useCallback(async () => {
    try {
      const newData = {
        tq_id: null,
        label: null,
        notes: null,
        t_arg: formatDateIsoShort(new Date()),
        complete_ts: null,
        status: 'Created',
      };
      const newId = await snapshotCreate(newData);
      showSuccess('New snapshot created successfully');

      const newRow = { ...newData, id: newId };
      gridApi?.applyTransaction({ add: [newRow] });

      const rowNode = gridApi?.getRowNode(newId.toString());
      if (!rowNode) return;

      setTimeout(() => {
        gridApi?.startEditingCell({
          rowIndex: rowNode.rowIndex,
          colKey: 'label',
        });
      }, 100);
    } catch (error) {
      showError(`Error creating new snapshot: ${error.message}`);
    }
  }, [rowData, gridApi, showError]);

  /**
   * Handles the "Temporal Batch" menu item click.
   */
  const onTemporalBatchBtnClick = useCallback(() => {
    setIsTemporalBatchDialogOpen(true);
    onNewBtnMenuClose();
  }, []);

  /**
   * Handles closing the temporal batch dialog.
   */
  const handleTemporalBatchDialogClose = useCallback(() => {
    setIsTemporalBatchDialogOpen(false);
  }, []);

  /**
   * Handles the creation of a temporal batch of snapshots.
   * @param {Object} params - The parameters for creating the temporal batch.
   * @param {string} params.tqId - The ID of the target query.
   * @param {string} params.labelTemplate - The template for the snapshot label.
   * @param {string} params.notesTemplate - The template for the snapshot notes.
   * @param {Array<string>} params.dates - The array of dates for which to create snapshots.
   */
  const handleCreateTemporalBatch = useCallback(
    async ({ tqId, tqName, labelTemplate, notesTemplate, dates }) => {
      try {
        for (const date of dates) {
          const newLabel = labelTemplate.replace('{tq}', tqName).replace('{date}', date);
          const newNotes = notesTemplate.replace('{tq}', tqName).replace('{date}', date);
          const newData = {
            tq_id: tqId,
            label: newLabel,
            notes: newNotes,
            t_arg: date,
            complete_ts: null,
            status: 'Created',
          };
          const newId = await snapshotCreate(newData);
          const newRow = { ...newData, id: newId };
          gridApi?.applyTransaction({ add: [newRow] });
        }
        showSuccess('Temporal batch created successfully');
      } catch (error) {
        showError(`Error creating temporal batch: ${error.message}`);
      }
    },
    [gridApi, showSuccess, showError]
  );

  /**
   * Handles closing the split button menu.
   */
  const onNewBtnMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  /**
   * Handles the "Delete" button click.
   * Confirms deletion with the user, then deletes the selected snapshots.
   */
  const onDeleteBtnClick = useCallback(async () => {
    const confirmed = await dialogs.confirm(`Delete the ${selectedRows.length} selected snapshots?`, {
      okText: 'Delete',
      title: 'Confirm Deletion',
      severity: 'warning',
    });

    if (confirmed) {
      const deletePromises = selectedRows.map((id) => snapshotDelete(id));
      Promise.all(deletePromises)
        .then(() => {
          const updatedRows = rowData.filter((row) => !selectedRows.includes(row.id));
          setRowData(updatedRows);
          showWarning('Selected snapshots deleted successfully');
        })
        .catch((error) => {
          showError(`Error deleting snapshots: ${error.message}`);
        });
    }
  }, [selectedRows, rowData, showWarning, showError, dialogs]);

  /**
   * Handles the "Refresh" button click.
   * Refreshes the grid with the latest data from the database.
   */
  const onRefreshBtnClick = useCallback(() => {
    snapshotFetchAll()
      .then((data) => {
        setRowData(data);
        showInfo('Snapshots refreshed successfully');
        console.info('Snapshots refreshed successfully');
      })
      .catch((error) => {
        console.error('Error fetching snapshots:', error);
        showError(`Error fetching snapshots: ${error.message}`);
      });
  }, []);

  /**
   * Handles the selection change event in the grid.
   * Updates the selected rows and enables/disables the delete button.
   */
  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedIds = selectedNodes.map((node) => node.data.id);
    setSelectedRows(selectedIds);
    setIsDeleteEnabled(selectedIds.length > 0);
  }, []);

  /**
   * Handles the cell value change event in the grid. Updates the snapshot in
   * the database with the new values. If the label is empty then picking a
   * target query will assign a default label in the format of
   * "Target Query Name - YYYY-MM-DD HH:mm:ss".
   * @param {Object} event - The event object containing the updated cell data.
   */
  const onCellValueChanged = useCallback(
    async (event) => {
      try {
        let updatedData = { ...event.data };
        if (event.colDef.field === 'tq_id' && event.newValue && (!event.data.label || event.data.label === '')) {
          const targetQueryName = tqMap[event.newValue];
          const now = DateTime.now();
          const formattedDate = now.toFormat('yyyy-MM-dd HH:mm:ss');
          updatedData.label = `${targetQueryName} - ${formattedDate}`;
        }
        await snapshotUpdate(updatedData);
        event.node.setData(updatedData);
        showSuccess('Snapshot updated successfully');
      } catch (error) {
        showError(`Error updating snapshot: ${error.message}`);
      }
    },
    [showSuccess, showError, tqMap]
  );

  /**
   * Handles the "Make Snapshot Serially" button click.
   * Calls the take-serial endpoint to run the selected snapshots in succession.
   */
  const onMakeSnapshotSerialClick = useCallback(async () => {
    try {
      const response = await fetch('/api/infra/snapshot/take-serial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ snapshotIds: selectedRows }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        showSuccess('Snapshots queued successfully');
      } else {
        showError(`Failed to queue snapshots: ${data.message}`);
      }
    } catch (error) {
      showError(`Error queueing snapshots: ${error.message}`);
    }
  }, [selectedRows, showSuccess, showError]);

  return (
    <div className="flex flex-col h-full">
      <title>Snapshots - Diff2Rule</title>
      <h1 className="text-2xl font-bold">Snapshots</h1>
      <h2 className="text-md">Capture current data source state</h2>

      <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
        <ButtonGroup variant="contained" color="primary" size="small" aria-label="split button">
          <Button onClick={onNewBtnClick}>New</Button>
          <Button
            size="small"
            aria-controls={isNewBtnMenuOpen ? 'split-button-menu' : undefined}
            aria-expanded={isNewBtnMenuOpen ? 'true' : undefined}
            aria-haspopup="menu"
            onClick={(event) => setAnchorEl(event.currentTarget)}
          >
            <ArrowDropDownIcon />
          </Button>
        </ButtonGroup>
        <Button
          variant="contained"
          color="warning"
          onClick={onMakeSnapshotSerialClick}
          size="small"
          disabled={selectedRows.length < 2}
          title="Make selected snapshots serially"
        >
          <PlayArrowIcon className="mr-1 -ml-0.5" />
          Serial
        </Button>
        <Menu
          id="split-button-menu"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={isNewBtnMenuOpen}
          onClose={onNewBtnMenuClose}
          MenuListProps={{
            'aria-labelledby': 'split-button',
          }}
        >
          <MenuItem onClick={onTemporalBatchBtnClick}>Temporal Batch</MenuItem>
        </Menu>
        <Button variant="contained" color="error" onClick={onDeleteBtnClick} size="small" disabled={!isDeleteEnabled}>
          Delete
        </Button>
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
          rowSelection={{
            mode: 'multiRow',
            checkboxes: true,
            headerCheckbox: true,
            enableClickSelection: true,
          }}
          singleClickEdit={true}
          getRowId={(params) => params.data.id?.toString()}
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
      <CreateTemporalBatchDialog
        open={isTemporalBatchDialogOpen}
        onClose={handleTemporalBatchDialogClose}
        onCreate={handleCreateTemporalBatch}
        tqMap={tqMap}
      />
    </div>
  );
}
