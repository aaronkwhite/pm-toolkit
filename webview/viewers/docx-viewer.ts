/**
 * PM Toolkit - Word Document Viewer
 *
 * Uses Mammoth.js for converting DOCX to HTML
 */

import mammoth from 'mammoth';

declare global {
  interface Window {
    docxData: string; // Base64 encoded DOCX data
  }
}

// State
let scale = 1.0;

// Elements
const contentEl = document.getElementById('content')!;
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
 * Update the zoom level
 */
function updateZoom(): void {
  contentEl.style.transform = `scale(${scale})`;
  contentEl.style.transformOrigin = 'top left';
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
 * Initialize the DOCX viewer
 */
async function init(): Promise<void> {
  try {
    const arrayBuffer = base64ToArrayBuffer(window.docxData);

    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.document-title:fresh",
        ],
      }
    );

    contentEl.innerHTML = result.value;

    // Log any warnings
    if (result.messages.length > 0) {
      console.log('Mammoth conversion warnings:', result.messages);
    }
  } catch (err) {
    console.error('Error loading DOCX:', err);
    contentEl.innerHTML = `
      <div class="error-message">
        <p>Error loading document</p>
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
