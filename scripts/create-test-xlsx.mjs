import * as XLSX from 'xlsx';
import { writeFileSync } from 'fs';

// Create a workbook with two sheets
const wb = XLSX.utils.book_new();

// Sheet 1: Sales Data
const salesData = [
  ['Product', 'Q1', 'Q2', 'Q3', 'Q4', 'Total'],
  ['Widget A', 1200, 1500, 1800, 2100, 6600],
  ['Widget B', 800, 900, 1100, 1400, 4200],
  ['Gadget X', 2000, 2200, 1900, 2500, 8600],
  ['Gadget Y', 500, 600, 750, 900, 2750],
];
const ws1 = XLSX.utils.aoa_to_sheet(salesData);
XLSX.utils.book_append_sheet(wb, ws1, 'Sales');

// Sheet 2: Employee Info
const employeeData = [
  ['ID', 'Name', 'Department', 'Salary', 'Start Date'],
  [1, 'Alice Smith', 'Engineering', 95000, '2022-01-15'],
  [2, 'Bob Johnson', 'Marketing', 75000, '2021-06-01'],
  [3, 'Carol White', 'Engineering', 105000, '2020-03-10'],
  [4, 'David Brown', 'Sales', 85000, '2023-02-20'],
];
const ws2 = XLSX.utils.aoa_to_sheet(employeeData);
XLSX.utils.book_append_sheet(wb, ws2, 'Employees');

// Write to file
const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
writeFileSync('tests/fixtures/viewers/test-spreadsheet.xlsx', buffer);

console.log('Created tests/fixtures/viewers/test-spreadsheet.xlsx');
