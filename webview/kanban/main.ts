/**
 * PM Toolkit - Kanban Board Webview
 *
 * Drag-and-drop kanban board backed by markdown
 */

// VS Code webview API
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode = acquireVsCodeApi();

// Board state
let boardContent = '';

// Initialize
function init() {
  const container = document.getElementById('board');
  if (!container) {
    console.error('Board container not found');
    return;
  }

  // TODO: Initialize kanban board here
  container.innerHTML = '<p style="padding: 20px; color: var(--vscode-foreground);">Kanban board loading... (dnd-kit will be initialized here)</p>';

  // Signal ready to extension
  vscode.postMessage({ type: 'ready' });
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      boardContent = message.payload.content;
      console.log('Received initial content:', boardContent.substring(0, 100));
      // TODO: Parse markdown and render board
      break;

    case 'update':
      boardContent = message.payload.content;
      console.log('Received updated content');
      // TODO: Update board from markdown
      break;
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
