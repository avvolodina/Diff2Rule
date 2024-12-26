'use client';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ruleSetFetchAll, ruleSetCreate, ruleSetDelete, ruleSetUpdate } from '@api/ui/rule-sets/basic';
import { useSnackbar } from '@components/SnackbarContext';
import { useDialogs } from '@toolpad/core/useDialogs';
import { Button, Stack, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BuildIcon from '@mui/icons-material/Build';
import RuleSetParamEditDialog from '@components/RuleSetParamEditDialog';
import LinebreaksToBrCellRenderer from '@components/LinebreaksToBrCellRenderer';

/**
 * Main component for the Rule Sets page.
 * Displays a grid of rule sets and provides functionality to manage them.
 */
const RuleSetsPage = () => {
  const router = useRouter();
  const { showSuccess, showWarning, showError } = useSnackbar();
  const dialogs = useDialogs();
  const gridRef = useRef(null);
  const gridApi = gridRef?.current?.api;
  const [rowData, setRowData] = useState([]);
  const columnDefs = useMemo(
    () => [
      { field: 'name', headerName: 'Name', editable: true },
      { field: 'handler', headerName: 'Handler', editable: true },
      {
        field: 'params',
        headerName: 'Parameters',
        editable: false,
        sortable: false,
        filter: false,
        flex: 2,
        valueFormatter: () => '',
        cellRenderer: (params) => {
          if (params.value) {
            const paramGrid = params.value.map((param, index) => (
              <React.Fragment key={index}>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{index + 1}.</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{param.label}</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{param.name}</div>
                <div className="overflow-hidden text-ellipsis whitespace-nowrap">{param.type}</div>
              </React.Fragment>
            ));
            return <div className="grid grid-cols-[repeat(4,auto)] gap-x-2 text-xs p-1">{paramGrid}</div>;
          } else {
            return (
              <div className="text-xs text-gray-500 whitespace-pre-wrap">
                Use the "Edit Parameters" tool button to add parameters.
              </div>
            );
          }
        },
        autoHeight: true,
      },
      { field: 'visualizer', headerName: 'Visualizer', editable: true },
      {
        field: 'descr',
        headerName: 'Description',
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
        /**
         * Replaces any newline characters with <br> tags.
         * @param {Object} params - The parameters passed to the cell renderer.
         * @param {string} params.value - The value of the cell.
         * @returns {JSX.Element} - The rendered cell content.
         */
        cellRenderer: LinebreaksToBrCellRenderer,
        flex: 2,
      },
      {
        headerName: 'Tools',
        filter: false,
        sortable: false,
        editable: false,
        cellRenderer: (params) => (
          <div className="flex items-center justify-center h-full">
            <IconButton
              title="Run Rule Set"
              className="rounded bg-green-500 hover:bg-green-700 p-0.5 mr-1"
              onClick={() => onRunRuleSetBtnClick(params.data)}
              disabled={!params.data.name || !params.data.handler || !params.data.params || !params.data.visualizer}
            >
              <PlayArrowIcon className="text-white text-sm" />
            </IconButton>
            <IconButton
              title="Edit Parameters"
              className="rounded bg-blue-500 hover:bg-blue-700 p-0.5 mr-1"
              onClick={() => onEditParamsClick(params.data)}
            >
              <BuildIcon className="text-white text-sm" />
            </IconButton>
            <IconButton
              title="Duplicate Rule Set"
              className="rounded bg-yellow-500 hover:bg-yellow-700 px-0.5 py-0"
              onClick={() => onDuplicateBtnClick(params.data)}
            >
              <span className="text-white text-sm"> ⧉ </span>
            </IconButton>
          </div>
        ),
        flex: 0.5,
      },
    ],
    [gridApi]
  );
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
   * Initially fetches all rule sets from the database.
   */
  useEffect(() => {
    ruleSetFetchAll()
      .then((data) => {
        setRowData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching rule sets:', error);
        showError(`Error fetching rule sets: ${error.message}`);
        setLoading(false);
      });
  }, []);

  /**
   * Navigates to the specified rule set on "Execute Rule Set" button click.
   */
  const onRunRuleSetBtnClick = useCallback((ruleSetData) => router.push(`/run/${ruleSetData.id}`), []);

  /**
   * Adds a new row to the grid and starts editing the name cell.
   * @param {Object} newData - The data for the new row.
   */
  const doAddRow = useCallback(
    async (newData) => {
      const newId = await ruleSetCreate(newData);
      showSuccess('New rule set created successfully');

      const newRow = { ...newData, id: newId };
      gridApi?.applyTransaction({ add: [newRow] });

      const rowNode = gridApi?.getRowNode(newId.toString());
      if (!rowNode) return;

      setTimeout(() => {
        gridApi?.startEditingCell({
          rowIndex: rowNode.rowIndex,
          colKey: 'name',
        });
      }, 100);
    },
    [gridApi, showSuccess]
  );

  /**
   * Handles the "New" button click.
   * Creates a new rule set with empty values, adds it to the grid, and enters edit mode.
   */
  const onNewBtnClick = useCallback(async () => {
    try {
      const newData = { name: null, handler: null, params: null, visualizer: null, descr: null };
      await doAddRow(newData);
    } catch (error) {
      showError(`Error creating new rule set: ${error.message}`);
    }
  }, [doAddRow, showError]);

  /**
   * Handles the "Duplicate" button click.
   * Creates a new rule set with the same values as the selected rule set,
   * but with an incremented name.
   */
  const onDuplicateBtnClick = useCallback(
    async (ruleSetData) => {
      try {
        const { name, ...rest } = ruleSetData;
        const nameRegex = /(.*?)(\s+(\d+))?$/;
        const match = name.match(nameRegex);
        const baseName = match[1];
        const existingNumber = match[3] ? parseInt(match[3], 10) : 1;
        const newName = `${baseName} ${existingNumber + 1}`;
        const newData = { ...rest, name: newName };
        await doAddRow(newData);
      } catch (error) {
        console.error('Error duplicating rule set:', error);
        showError(`Error duplicating rule set: ${error.message}`);
      }
    },
    [doAddRow, showError]
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDialogData, setEditDialogData] = useState(null);

  const onEditParamsClick = useCallback((ruleSetData) => {
    setEditDialogData(ruleSetData);
    setEditDialogOpen(true);
  }, []);

  const onEditDialogSave = useCallback(
    async (updatedParams) => {
      if (editDialogData) {
        const updatedData = { ...editDialogData, params: updatedParams };
        await ruleSetUpdate(updatedData);
        showSuccess('Parameters updated successfully');
        const updatedRowData = rowData.map((row) => (row.id === editDialogData.id ? updatedData : row));
        setRowData(updatedRowData);
        setEditDialogOpen(false);
      }
    },
    [rowData, showSuccess, showError, editDialogData]
  );

  const onEditDialogClose = useCallback(() => {
    setEditDialogOpen(false);
  }, []);

  /**
   * Handles the "Delete" button click.
   * Confirms deletion with the user, then deletes the selected rule sets.
   */
  const onDeleteBtnClick = useCallback(async () => {
    const confirmed = await dialogs.confirm(`Delete the ${selectedRows.length} selected rule sets?`, {
      okText: 'Delete',
      title: 'Confirm Deletion',
      severity: 'warning',
    });

    if (confirmed) {
      const deletePromises = selectedRows.map((id) => ruleSetDelete(id));
      Promise.all(deletePromises)
        .then(() => {
          const updatedRows = rowData.filter((row) => !selectedRows.includes(row.id));
          setRowData(updatedRows);
          showWarning('Selected rule sets deleted successfully');
        })
        .catch((error) => {
          showError(`Error deleting rule sets: ${error.message}`);
        });
    }
  }, [selectedRows, rowData, showWarning, showError, dialogs]);

  /**
   * Handles the "Refresh" button click.
   * Refreshes the grid with the latest data from the database.
   */
  const onRefreshBtnClick = useCallback(() => {
    ruleSetFetchAll()
      .then((data) => {
        setRowData(data);
        showSuccess('Rule sets refreshed successfully');
        console.info('Rule sets refreshed successfully');
      })
      .catch((error) => {
        console.error('Error fetching rule sets:', error);
        showError(`Error fetching rule sets: ${error.message}`);
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
   * Handles the cell value change event in the grid. Updates the rule set in
   * the database with the new values.
   * @param {Object} event - The event object containing the updated cell data.
   */
  const onCellValueChanged = useCallback(
    async (event) => {
      try {
        await ruleSetUpdate(event.data);
        showSuccess('Rule set updated successfully');
      } catch (error) {
        showError(`Error updating rule set: ${error.message}`);
      }
    },
    [showSuccess, showError]
  );

  return (
    <div className="flex flex-col h-full">
      <title>Rule Sets - Diff2Rule</title>
      <h1 className="text-2xl font-bold">Rule Sets</h1>
      <h2 className="text-md">Manage validation rules</h2>

      <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
        <Button variant="contained" color="primary" onClick={onNewBtnClick} size="small">
          New
        </Button>
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
          stopEditingWhenCellsLoseFocus={true}
          getRowId={(params) => params.data.id?.toString()}
          onSelectionChanged={onSelectionChanged}
          onCellValueChanged={onCellValueChanged}
          loading={loading}
        />
      </div>
      <RuleSetParamEditDialog
        open={editDialogOpen}
        onClose={onEditDialogClose}
        onSave={onEditDialogSave}
        value={editDialogData}
      />
    </div>
  );
};

export default RuleSetsPage;
