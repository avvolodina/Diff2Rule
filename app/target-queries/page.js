'use client';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  targetQueryFetchAll,
  targetQueryDelete,
  targetQueryCreate,
  targetQueryUpdate,
} from '@api/ui/target-queries/basic';
import { useSnackbar } from '@components/SnackbarContext';
import { useDialogs } from '@toolpad/core/useDialogs';
import { Button, Stack, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import GrainIcon from '@mui/icons-material/Grain';
import FlareIcon from '@mui/icons-material/Flare';

/**
 * Main component for the Target Queries page.
 * Displays a grid of target queries and provides functionality to manage them.
 */
export default function TargetQueriesPage() {
  const { showSuccess, showWarning, showError } = useSnackbar();
  const dialogs = useDialogs();
  const gridRef = useRef(null);
  const gridApi = gridRef?.current?.api;
  const [rowData, setRowData] = useState([]);
  const [columnDefs] = useState([
    {
      field: 'name',
      headerName: 'Name',
      editable: true,
    },
    { field: 'handler', headerName: 'Handler', editable: true },
    { field: 'snapshot_table', headerName: 'Snapshot Table', editable: true },
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
      /**
       * Replaces any newline characters with <br> tags.
       * @param {Object} params - The parameters passed to the cell renderer.
       * @param {string} params.value - The value of the cell.
       * @returns {JSX.Element} - The rendered cell content.
       */
      cellRenderer: (params) => {
        return <div dangerouslySetInnerHTML={{ __html: params.value.replace(/[\r\n]+/g, '<br/>') }} />;
      },
      flex: 2,
    },
    {
      headerName: 'Tools',
      filter: false,
      sortable: false,
      editable: false,
      /**
       * Renders a toolbar with buttons for the target query.
       * @param {Object} params - The parameters passed to the cell renderer.
       * @returns {JSX.Element} - The rendered cell content.
       */
      cellRenderer: (params) => (
        <div className="flex items-center justify-center h-full">
          <IconButton
            title="Log query DDL"
            className="rounded bg-green-500 hover:bg-green-700 p-0.5"
            onClick={() => onLogQueryDdlClick(params.data.id)}
          >
            <GrainIcon className="text-white text-sm" />
          </IconButton>
          <IconButton
            title="Create snapshot table"
            className="rounded bg-blue-500 hover:bg-blue-700 p-0.5 ml-2"
            onClick={() => {
              onCreateSnapshotTableClick(params.data.id);
            }}
          >
            <FlareIcon className="text-white text-sm" />
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

  /**
   * Initially loads all target queries.
   */
  useEffect(() => {
    targetQueryFetchAll()
      .then((data) => {
        setRowData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching target queries:', error);
        showError(`Error fetching target queries: ${error.message}`);
        setLoading(false);
      });
  }, []);

  /**
   * Handles the "New" button click.
   * Creates a new target query with empty values, adds it to the grid, and enters edit mode.
   */
  const handleNew = useCallback(async () => {
    try {
      const newData = { name: '', handler: '', snapshot_table: '', notes: '' };
      const newId = await targetQueryCreate(newData);
      showSuccess('New target query created successfully');

      const newRow = { ...newData, id: newId };
      gridApi?.applyTransaction({ add: [newRow] });

      const rowNode = gridApi?.getRowNode(newId.toString());
      if (!rowNode) return;

      // NOTE: applyTransaction() does not update immediately, so we need to wait a bit
      setTimeout(() => {
        gridApi?.startEditingCell({
          rowIndex: rowNode.rowIndex,
          colKey: 'name',
        });
      }, 100); // 100ms delay
    } catch (error) {
      showError(`Error creating new target query: ${error.message}`);
    }
  }, [rowData, gridApi, showError]);

  /**
   * Handles the "Delete" button click.
   * Confirms deletion with the user, then deletes the selected target queries.
   */
  const handleDelete = useCallback(async () => {
    const confirmed = await dialogs.confirm(`Delete the ${selectedRows.length} selected target queries?`, {
      okText: 'Delete',
      title: 'Confirm Deletion',
      severity: 'warning',
    });

    if (confirmed) {
      const deletePromises = selectedRows.map((id) => targetQueryDelete(id));
      Promise.all(deletePromises)
        .then(() => {
          const updatedRows = rowData.filter((row) => !selectedRows.includes(row.id));
          setRowData(updatedRows);
          showWarning('Selected target queries deleted successfully');
        })
        .catch((error) => {
          showError(`Error deleting target queries: ${error.message}`);
        });
    }
  }, [selectedRows, rowData, showWarning, showError, dialogs]);

  /**
   * Handles the "Refresh" button click.
   * Refreshes the grid with the latest data from the database.
   */
  const handleRefresh = useCallback(() => {
    targetQueryFetchAll()
      .then((data) => {
        setRowData(data);
        showSuccess('Target queries refreshed successfully');
        console.info('Target queries refreshed successfully');
      })
      .catch((error) => {
        console.error('Error fetching target queries:', error);
        showError(`Error fetching target queries: ${error.message}`);
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
   * Handles the "Log query DDL" button click.
   * Logs the DDL of the target query with the given ID.
   * @param {number} tqId - The ID of the target query.
   */
  const onLogQueryDdlClick = useCallback(
    async (tqId) => {
      try {
        const response = await fetch(`/api/infra/tq-ddl/log?tqId=${tqId}`);
        const data = await response.json();
        if (data.status == 'success') {
          console.log('data.ddlJson', data.ddlJson);
          showSuccess('Query DDL is being logged');
        } else {
          showError('Failed to log query DDL');
        }
      } catch (error) {
        showError(`Error logging query DDL: ${error.message}`);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Handles the "Create Snapshot Table" button click.
   * Creates a snapshot table for the target query with the given ID.
   * @param {number} tqId - The ID of the target query.
   */
  const onCreateSnapshotTableClick = useCallback(
    async (tqId) => {
      try {
        const response = await fetch(`/api/infra/snapshot/create-table?tqId=${tqId}`);
        const data = await response.json();
        if (data.status == 'success') {
          showSuccess('Snapshot table created successfully');
        } else {
          showError(`Failed to create snapshot table: ${data.message}`);
        }
      } catch (error) {
        showError(`Error creating snapshot table: ${error.message}`);
      }
    },
    [showSuccess, showError]
  );

  /**
   * Handles the cell value change event in the grid.
   * Updates the target query in the database with the new values.
   * @param {Object} event - The event object containing the updated cell data.
   */
  const onCellValueChanged = useCallback((event) => {
    targetQueryUpdate(event.data)
      .then(() => {
        showSuccess('Target query updated successfully');
      })
      .catch((error) => {
        showError(`Error updating target query: ${error.message}`);
      });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <title>Target Queries - Diff2Rule</title>
      <h1 className="text-2xl font-bold">Target Queries</h1>
      <h2 className="text-md">Manage data sources</h2>

      <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
        <Button variant="contained" color="success" onClick={handleNew} size="small">
          New
        </Button>
        <Button variant="contained" color="error" onClick={handleDelete} size="small" disabled={!isDeleteEnabled}>
          Delete
        </Button>
        <IconButton color="primary" onClick={handleRefresh} size="small" title="Refresh">
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
          getRowId={(params) => params.data.id?.toString()}
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
        />
      </div>
    </div>
  );
}
