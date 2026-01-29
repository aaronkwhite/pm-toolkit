/**
 * PM Toolkit - CSV Viewer
 *
 * Uses Papa Parse for parsing CSV/TSV files
 */

import Papa from 'papaparse';

declare global {
  interface Window {
    csvData: string; // Raw CSV text
    filename: string;
  }
}

// State
let data: string[][] = [];
let headers: string[] = [];
let hasHeader = true;
let sortColumn = -1;
let sortAscending = true;
let scale = 1.0;

// Elements
const tableContainerEl = document.getElementById('tableContainer')!;
const zoomLevelEl = document.getElementById('zoomLevel')!;
const rowCountEl = document.getElementById('rowCount')!;
const headerToggleEl = document.getElementById('headerToggle') as HTMLInputElement;
const delimiterSelectEl = document.getElementById('delimiterSelect') as HTMLSelectElement;

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get sorted data
 */
function getSortedData(): string[][] {
  if (sortColumn === -1) {
    return data;
  }

  return [...data].sort((a, b) => {
    const valA = a[sortColumn] || '';
    const valB = b[sortColumn] || '';

    // Try numeric comparison
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return sortAscending ? numA - numB : numB - numA;
    }

    // String comparison
    return sortAscending
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });
}

/**
 * Render the table
 */
function renderTable(): void {
  const sortedData = getSortedData();
  const displayHeaders = hasHeader ? headers : headers.map((_, i) => `Column ${i + 1}`);

  let html = '<table class="csv-table">';

  // Header row
  html += '<thead><tr>';
  displayHeaders.forEach((header, i) => {
    const sortIcon = sortColumn === i
      ? (sortAscending ? ' ▲' : ' ▼')
      : '';
    html += `<th data-column="${i}" class="sortable">${escapeHtml(header)}${sortIcon}</th>`;
  });
  html += '</tr></thead>';

  // Data rows
  html += '<tbody>';
  sortedData.forEach((row) => {
    html += '<tr>';
    row.forEach((cell) => {
      html += `<td>${escapeHtml(cell)}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';

  tableContainerEl.innerHTML = html;

  // Add sort handlers
  tableContainerEl.querySelectorAll('th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const column = parseInt(th.getAttribute('data-column') || '0', 10);
      if (sortColumn === column) {
        sortAscending = !sortAscending;
      } else {
        sortColumn = column;
        sortAscending = true;
      }
      renderTable();
    });
  });

  // Update row count
  rowCountEl.textContent = `${sortedData.length} rows`;
  updateZoom();
}

/**
 * Parse the CSV with the given delimiter
 */
function parseCSV(delimiter?: string): void {
  const config: Papa.ParseConfig = {
    skipEmptyLines: true,
  };

  if (delimiter) {
    config.delimiter = delimiter;
  }

  const result = Papa.parse<string[]>(window.csvData, config);

  if (result.errors.length > 0) {
    console.warn('CSV parse warnings:', result.errors);
  }

  const allRows = result.data;

  if (hasHeader && allRows.length > 0) {
    headers = allRows[0];
    data = allRows.slice(1);
  } else {
    // Generate column names
    const maxCols = Math.max(...allRows.map((r) => r.length));
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    data = allRows;
  }

  // Reset sort
  sortColumn = -1;
  sortAscending = true;

  renderTable();
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
 * Initialize the CSV viewer
 */
function init(): void {
  try {
    // Auto-detect delimiter based on filename
    if (window.filename.endsWith('.tsv')) {
      delimiterSelectEl.value = '\t';
    }

    parseCSV(delimiterSelectEl.value || undefined);
  } catch (err) {
    console.error('Error loading CSV:', err);
    tableContainerEl.innerHTML = `
      <div class="error-message">
        <p>Error loading file</p>
        <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
      </div>
    `;
  }
}

// Set up button handlers
document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
document.getElementById('resetZoom')?.addEventListener('click', resetZoom);

// Header toggle
headerToggleEl?.addEventListener('change', () => {
  hasHeader = headerToggleEl.checked;
  parseCSV(delimiterSelectEl.value || undefined);
});

// Delimiter change
delimiterSelectEl?.addEventListener('change', () => {
  parseCSV(delimiterSelectEl.value || undefined);
});

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
