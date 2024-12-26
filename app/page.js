'use client';
import React from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const data1 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'Dataset 1',
      backgroundColor: 'rgba(255,99,132,0.2)',
      borderColor: 'rgba(255,99,132,1)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(255,99,132,0.4)',
      hoverBorderColor: 'rgba(255,99,132,1)',
      data: [65, 59, 80, 81, 56, 55, 40],
    },
  ],
};

const data2 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'Dataset 2',
      backgroundColor: 'rgba(54,162,235,0.2)',
      borderColor: 'rgba(54,162,235,1)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(54,162,235,0.4)',
      hoverBorderColor: 'rgba(54,162,235,1)',
      data: [40, 55, 56, 81, 80, 59, 65],
    },
  ],
};

const data3 = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
  datasets: [
    {
      label: 'Dataset 3',
      backgroundColor: 'rgba(75,192,192,0.2)',
      borderColor: 'rgba(75,192,192,1)',
      borderWidth: 1,
      hoverBackgroundColor: 'rgba(75,192,192,0.4)',
      hoverBorderColor: 'rgba(75,192,192,1)',
      data: [30, 45, 50, 70, 75, 60, 40],
    },
  ],
};

const columnDefs1 = [{ field: 'make' }, { field: 'model' }, { field: 'price' }];
const columnDefs2 = [{ field: 'year' }, { field: 'color' }, { field: 'mileage' }];
const columnDefs3 = [{ field: 'brand' }, { field: 'type' }, { field: 'cost' }];

const rowData1 = [
  { make: 'Toyota', model: 'Celica', price: 35000 },
  { make: 'Ford', model: 'Mondeo', price: 32000 },
  { make: 'Porsche', model: 'Boxster', price: 72000 },
];

const rowData2 = [
  { year: 2018, color: 'Red', mileage: 25000 },
  { year: 2019, color: 'Blue', mileage: 30000 },
  { year: 2020, color: 'Green', mileage: 20000 },
];

const rowData3 = [
  { brand: 'Apple', type: 'iPhone', cost: 999 },
  { brand: 'Samsung', type: 'Galaxy', cost: 899 },
  { brand: 'Google', type: 'Pixel', cost: 799 },
];

export default function Home() {
  return (
    <div className="min-h-full bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Current Status</h1>
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Line data={data1} />
        </div>
        <div className="col-span-1">
          <Bar data={data2} />
        </div>
        <div className="col-span-1">
          <div style={{ width: 250, height: 250 }}>
            <Pie data={data3} />
          </div>
        </div>
        <div className="col-span-1">
          <div style={{ height: 250, width: '100%' }}>
            <AgGridReact columnDefs={columnDefs1} rowData={rowData1} />
          </div>
        </div>
        <div className="col-span-1">
          <Line data={data2} />
        </div>
        <div className="col-span-1">
          <Bar data={data3} />
        </div>
        <div className="col-span-1">
          <div style={{ width: 250, height: 250 }}>
            <Pie data={data1} />
          </div>
        </div>
        <div className="col-span-1">
          <div style={{ height: 250, width: '100%' }}>
            <AgGridReact columnDefs={columnDefs2} rowData={rowData2} />
          </div>
        </div>
        <div className="col-span-1">
          <Line data={data3} />
        </div>
        <div className="col-span-1">
          <Bar data={data1} />
        </div>
        <div className="col-span-1">
          <div style={{ width: 250, height: 250 }}>
            <Pie data={data2} />
          </div>
        </div>
        <div className="col-span-1">
          <div style={{ height: 250, width: '100%' }}>
            <AgGridReact columnDefs={columnDefs3} rowData={rowData3} />
          </div>
        </div>
      </div>
    </div>
  );
}
