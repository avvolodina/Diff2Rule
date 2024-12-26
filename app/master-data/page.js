'use client';
import React, { useCallback, useMemo, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';

export default function MasterDataPage() {
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), []);
  const gridStyle = useMemo(() => ({ height: '100%', width: '100%' }), []);
  const [rowData, setRowData] = useState();
  const [columnDefs, setColumnDefs] = useState([
    { field: 'athlete', minWidth: 170 },
    { field: 'age' },
    { field: 'country' },
    { field: 'year' },
    { field: 'date' },
    { field: 'sport' },
    { field: 'gold' },
    { field: 'silver' },
    { field: 'bronze' },
    { field: 'total' },
  ]);
  const defaultColDef = useMemo(() => {
    return {
      filter: true,
    };
  }, []);

  const onGridReady = useCallback((params) => {
    fetch('https://www.ag-grid.com/example-assets/olympic-winners.json')
      .then((resp) => resp.json())
      .then((data) => setRowData(data));
  }, []);

  const changeSize = useCallback((value) => {
    document.documentElement.style.setProperty('--ag-spacing', `${value}px`);
    document.getElementById('spacing').innerText = value.toFixed(1);
  }, []);

  return (
    <div style={containerStyle}>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            flex: 'none',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}
        >
          spacing ={' '}
          <span style={{ minWidth: '50px' }}>
            <span id="spacing">8.0</span>px
          </span>
          <input
            type="range"
            onInput={() => changeSize(event.target.valueAsNumber)}
            defaultValue="8"
            min="0"
            max="20"
            step="0.1"
            style={{ width: '200px' }}
          />
        </div>

        <div style={gridStyle}>
          <AgGridReact
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            animateRows={false}
            onGridReady={onGridReady}
          />
        </div>
      </div>
    </div>
  );
}
