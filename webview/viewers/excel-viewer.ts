/**
 * PM Toolkit - Excel Viewer
 *
 * Uses SheetJS (xlsx) for parsing Excel files
 */

import * as XLSX from 'xlsx';

declare global {
  interface Window {
    excelData: string; // Base64 encoded Excel data
  }
}

// State
let workbook: XLSX.WorkBook | null = null;
let currentSheet = 0;
let scale = 1.0;

// Elements
const sheetTabsEl = document.getElementById('sheetTabs')!;
const tableContainerEl = document.getElementById('tableContainer')!;
const zoomLevelEl = document.getElementById('zoomLevel')!;

/**
 * Convert base64 to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get column letter (A, B, C, ... AA, AB, etc.)
 */
function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render sheet tabs
 */
function renderSheetTabs(): void {
  if (!workbook) return;

  sheetTabsEl.innerHTML = workbook.SheetNames.map(
    (name, index) => `
      <button class="sheet-tab ${index === currentSheet ? 'active' : ''}" data-index="${index}">
        ${escapeHtml(name)}
      </button>
    `
  ).join('');

  // Add click handlers
  sheetTabsEl.querySelectorAll('.sheet-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      currentSheet = parseInt(tab.getAttribute('data-index') || '0', 10);
      renderSheet();
      renderSheetTabs();
    });
  });
}

/**
 * Render the current sheet as a table
 */
function renderSheet(): void {
  if (!workbook) return;

  const sheetName = workbook.SheetNames[currentSheet];
  const sheet = workbook.Sheets[sheetName];

  // Get the range of the sheet
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  const numRows = range.e.r - range.s.r + 1;
  const numCols = range.e.c - range.s.c + 1;

  // Build the table HTML
  let html = '<table class="excel-table">';

  // Header row with column letters
  html += '<thead><tr><th class="row-header"></th>';
  for (let c = 0; c < numCols; c++) {
    html += `<th class="col-header">${getColumnLetter(c)}</th>`;
  }
  html += '</tr></thead>';

  // Data rows
  html += '<tbody>';
  for (let r = 0; r < numRows; r++) {
    html += `<tr><td class="row-header">${r + 1}</td>`;
    for (let c = 0; c < numCols; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r: r + range.s.r, c: c + range.s.c });
      const cell = sheet[cellAddress];
      const value = cell ? (cell.w || String(cell.v || '')) : '';
      html += `<td>${escapeHtml(value)}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';

  tableContainerEl.innerHTML = html;
  updateZoom();
}

/**
 * Update the zoom level
 */
function updateZoom(): void {
  const table = tableContainerEl.querySelector('table');
  if (table) {
    table.style.transform = `scale(${scale})`;
    table.style.transformOrigin = 'top left';
  }
  zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
}

/**
 * Zoom in
 */
function zoomIn(): void {
  if (scale < 2.0) {
    scale += 0.1;
    updateZoom();
  }
}

/**
 * Zoom out
 */
function zoomOut(): void {
  if (scale > 0.5) {
    scale -= 0.1;
    updateZoom();
  }
}

/**
 * Reset zoom to 100%
 */
function resetZoom(): void {
  scale = 1.0;
  updateZoom();
}

/**
 * Initialize the Excel viewer
 */
async function init(): Promise<void> {
  try {
    const arrayBuffer = base64ToArrayBuffer(window.excelData);
    workbook = XLSX.read(arrayBuffer, { type: 'array' });

    renderSheetTabs();
    renderSheet();
  } catch (err) {
    console.error('Error loading Excel file:', err);
    tableContainerEl.innerHTML = `
      <div class="error-message">
        <p>Error loading spreadsheet</p>
        <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
      </div>
    `;
  }
}

// Set up button handlers
document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
document.getElementById('resetZoom')?.addEventListener('click', resetZoom);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === '+' || e.key === '=') {
    zoomIn();
  } else if (e.key === '-') {
    zoomOut();
  } else if (e.key === '0') {
    resetZoom();
  }
});

// Start
init();
