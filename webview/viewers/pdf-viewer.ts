/**
 * PM Toolkit - PDF Viewer
 *
 * Uses PDF.js for rendering PDF documents
 */

import * as pdfjsLib from 'pdfjs-dist';

declare global {
  interface Window {
    pdfUrl: string;
    workerUrl: string;
  }
}

// State
let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
let currentPage = 1;
let scale = 1.0;
let rotation = 0;

// Elements
const canvas = document.getElementById('pdfCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const currentPageEl = document.getElementById('currentPage')!;
const totalPagesEl = document.getElementById('totalPages')!;
const zoomLevelEl = document.getElementById('zoomLevel')!;

/**
 * Render the current page
 */
async function renderPage(): Promise<void> {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(currentPage);
  const viewport = page.getViewport({ scale, rotation });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  currentPageEl.textContent = String(currentPage);
  zoomLevelEl.textContent = `${Math.round(scale * 100)}%`;
}

/**
 * Go to previous page
 */
function prevPage(): void {
  if (currentPage > 1) {
    currentPage--;
    renderPage();
  }
}

/**
 * Go to next page
 */
function nextPage(): void {
  if (pdfDoc && currentPage < pdfDoc.numPages) {
    currentPage++;
    renderPage();
  }
}

/**
 * Zoom in
 */
function zoomIn(): void {
  if (scale < 3.0) {
    scale += 0.25;
    renderPage();
  }
}

/**
 * Zoom out
 */
function zoomOut(): void {
  if (scale > 0.25) {
    scale -= 0.25;
    renderPage();
  }
}

/**
 * Fit to width
 */
function fitWidth(): void {
  if (!pdfDoc) return;

  pdfDoc.getPage(currentPage).then((page) => {
    const viewport = page.getViewport({ scale: 1.0, rotation });
    const containerWidth = document.getElementById('viewer')!.clientWidth - 40;
    scale = containerWidth / viewport.width;
    renderPage();
  });
}

/**
 * Rotate left (counter-clockwise)
 */
function rotateLeft(): void {
  rotation = (rotation - 90 + 360) % 360;
  renderPage();
}

/**
 * Rotate right (clockwise)
 */
function rotateRight(): void {
  rotation = (rotation + 90) % 360;
  renderPage();
}

/**
 * Initialize the PDF viewer
 */
async function init(): Promise<void> {
  // Set up PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = window.workerUrl;

  try {
    // Load the PDF
    const loadingTask = pdfjsLib.getDocument(window.pdfUrl);
    pdfDoc = await loadingTask.promise;

    totalPagesEl.textContent = String(pdfDoc.numPages);

    // Initial render with fit to width
    fitWidth();
  } catch (err) {
    console.error('Error loading PDF:', err);
    document.getElementById('viewer')!.innerHTML = `
      <div class="error-message">
        <p>Error loading PDF</p>
        <p>${err instanceof Error ? err.message : 'Unknown error'}</p>
      </div>
    `;
  }
}

// Set up button handlers
document.getElementById('prev')?.addEventListener('click', prevPage);
document.getElementById('next')?.addEventListener('click', nextPage);
document.getElementById('zoomIn')?.addEventListener('click', zoomIn);
document.getElementById('zoomOut')?.addEventListener('click', zoomOut);
document.getElementById('fitWidth')?.addEventListener('click', fitWidth);
document.getElementById('rotateLeft')?.addEventListener('click', rotateLeft);
document.getElementById('rotateRight')?.addEventListener('click', rotateRight);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  switch (e.key) {
    case 'ArrowLeft':
    case 'PageUp':
      prevPage();
      break;
    case 'ArrowRight':
    case 'PageDown':
      nextPage();
      break;
    case '+':
    case '=':
      zoomIn();
      break;
    case '-':
      zoomOut();
      break;
  }
});

// Start
init();
