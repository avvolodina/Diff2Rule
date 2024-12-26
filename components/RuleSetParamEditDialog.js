import React, { useCallback, useEffect, useState } from 'react';
import uniqid from 'uniqid';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Stack } from '@mui/material';
import { AgGridReact } from 'ag-grid-react';
import { useRef } from 'react';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const RuleSetParamEditDialog = ({ open, onClose, onSave, value }) => {
  const [rowData, setRowData] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDeleteEnabled, setIsDeleteEnabled] = useState(false);

  const gridRef = useRef(null);
  const [columnDefs] = useState([
    {
      field: 'label',
      headerName: 'Label',
      editable: true,
      rowDrag: true,
    },
    { field: 'name', headerName: 'JavaScript Name', editable: true },
    {
      field: 'type',
      headerName: 'Type',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['Text/Number', 'Selection list', 'Date', 'Snapshot'],
      },
    },
  ]);

  /**
   * Initializes the grid on dialog open.
   */
  useEffect(() => {
    try {
      if (value && value.params) {
        const paramsWithIds = value.params.map((element) => ({
          ...element,
          id: uniqid(),
        }));
        setRowData(paramsWithIds);
      } else {
        setRowData([]);
      }
    } catch (error) {
      console.error('Error parsing value:', error);
    }
  }, [value, open]);

  const handleSave = useCallback(() => {
    const isEmpty = rowData.length === 0;
    if (isEmpty) {
      alert('At least one parameter is required.');
      return;
    }

    const isValid = rowData.every((row) => row.label && row.name && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(row.name));
    if (!isValid) {
      alert('All rows must have a label and a valid JavaScript name.');
      return;
    }

    const isUnique = new Set(rowData.map((row) => row.name)).size === rowData.length;
    if (!isUnique) {
      alert('JavaScript names must be unique.');
      return;
    }

    const resParams = [];
    gridRef.current.api.forEachNode((rowNode) => {
      resParams.push({ ...rowNode.data, id: undefined });
    });
    onSave(resParams);
    onClose();
  }, [rowData, onSave, onClose]);

  const handleAddRow = useCallback(() => {
    setRowData([
      ...rowData,
      {
        id: uniqid(),
        label: '',
        name: '',
        type: 'Text/Number',
      },
    ]);
  }, [rowData]);

  const handleDeleteRow = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedData = selectedNodes.map((node) => node.data);
    const updatedRowData = rowData.filter((row) => !selectedData.includes(row));
    setRowData(updatedRowData);
  }, [rowData]);

  const onSelectionChanged = useCallback(() => {
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedIds = selectedNodes.map((node) => node.data.id);
    setSelectedRows(selectedIds);
    setIsDeleteEnabled(selectedIds.length > 0);
  }, []);

  const onCellValueChanged = useCallback(
    (event) => {
      const updatedRowData = rowData.map((row) => (row.id === event.data.id ? event.data : row));
      setRowData(updatedRowData);
    },
    [rowData]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit Parameters</DialogTitle>
      <DialogContent>
        <Stack direction="row" spacing={1} justifyContent="flex-end" marginBottom={1}>
          <IconButton color="primary" onClick={handleAddRow} size="small">
            <AddIcon />
          </IconButton>
          <IconButton color="secondary" onClick={handleDeleteRow} size="small" disabled={!isDeleteEnabled}>
            <RemoveIcon />
          </IconButton>
        </Stack>
        <div className="ag-theme-material" style={{ height: 300 }}>
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={{ editable: true, flex: 1 }}
            rowSelection={{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
            }}
            rowDragManaged={true}
            rowDragMultiRow={true}
            singleClickEdit={true}
            stopEditingWhenCellsLoseFocus={true}
            getRowId={(params) => params.data.id?.toString()}
            onCellValueChanged={onCellValueChanged}
            onSelectionChanged={onSelectionChanged}
          />
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleSave} color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RuleSetParamEditDialog;
