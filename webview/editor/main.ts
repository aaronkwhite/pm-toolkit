/**
 * PM Toolkit - Markdown Editor Webview
 *
 * Tiptap-based WYSIWYG editor for markdown files
 */

// VS Code webview API
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode = acquireVsCodeApi();

// Editor state
let editorContent = '';

// Initialize
function init() {
  const container = document.getElementById('editor');
  if (!container) {
    console.error('Editor container not found');
    return;
  }

  // TODO: Initialize Tiptap editor here
  container.innerHTML = '<p style="padding: 20px; color: var(--vscode-foreground);">Editor loading... (Tiptap will be initialized here)</p>';

  // Signal ready to extension
  vscode.postMessage({ type: 'ready' });
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      editorContent = message.payload.content;
      console.log('Received initial content:', editorContent.substring(0, 100));
      // TODO: Set editor content
      break;

    case 'update':
      editorContent = message.payload.content;
      console.log('Received updated content');
      // TODO: Update editor content
      break;

    case 'templates':
      console.log('Received templates:', message.payload.templates);
      // TODO: Update slash command menu with templates
      break;
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
