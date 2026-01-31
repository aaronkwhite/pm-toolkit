/**
 * PM Toolkit - Kanban Board Webview
 *
 * Drag-and-drop kanban board backed by markdown
 */

import {
  parseMarkdown,
  serializeBoard,
  moveCard,
  toggleCard,
  addCard,
  updateCard,
  deleteCard,
  updateColumnSettings,
  type KanbanBoard,
  type ColumnSettings,
} from './parser';
import { KanbanDragDrop, type DragEndEvent } from './dnd';
import { renderBoard, showAddCardInput, type UICallbacks } from './ui';
import { hideColumnMenu } from './menu';

// VS Code webview API
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode = acquireVsCodeApi();

// Board state
let board: KanbanBoard | null = null;
let dnd: KanbanDragDrop | null = null;

// Flag to prevent feedback loops
let isUpdatingFromExtension = false;

// Debounce timer
let updateTimeout: number | null = null;
const DEBOUNCE_MS = 150;

/**
 * Send board update to extension
 */
function sendUpdate(): void {
  if (!board || isUpdatingFromExtension) return;

  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  updateTimeout = window.setTimeout(() => {
    const markdown = serializeBoard(board!);
    vscode.postMessage({
      type: 'update',
      payload: { content: markdown },
    });
  }, DEBOUNCE_MS);
}

/**
 * Re-render the board and set up drag-drop
 */
function render(): void {
  const container = document.getElementById('board');
  if (!container || !board) return;

  // Close any open menus before re-rendering
  hideColumnMenu();

  const callbacks: UICallbacks = {
    onToggleCard: (cardId) => {
      board = toggleCard(board!, cardId);
      render();
      sendUpdate();
    },
    onAddCard: (columnId) => {
      showAddCardInput(
        columnId,
        (text) => {
          board = addCard(board!, columnId, text);
          render();
          sendUpdate();
        },
        () => {
          // Cancelled, no action needed
        }
      );
    },
    onDeleteCard: (cardId) => {
      board = deleteCard(board!, cardId);
      render();
      sendUpdate();
    },
    onCardTextChange: (cardId, text) => {
      board = updateCard(board!, cardId, { text });
      render();
      sendUpdate();
    },
    onCardDescriptionChange: (cardId, description) => {
      board = updateCard(board!, cardId, { description });
      render();
      sendUpdate();
    },
    onColumnSettingsChange: (columnId, settings) => {
      board = updateColumnSettings(board!, columnId, settings);
      render();
      sendUpdate();
    },
  };

  renderBoard(container, board, callbacks);
  setupDragDrop();
}

/**
 * Set up drag-drop for all cards and columns
 */
function setupDragDrop(): void {
  // Clean up existing
  if (dnd) {
    dnd.destroy();
  }

  dnd = new KanbanDragDrop((event: DragEndEvent) => {
    if (!board) return;

    board = moveCard(board, event.cardId, event.toColumnId, event.toIndex);
    render();
    sendUpdate();
  });

  // Register all columns as drop targets
  const columnEls = document.querySelectorAll('.kanban-column');
  columnEls.forEach((el) => {
    const columnId = (el as HTMLElement).dataset.columnId;
    if (columnId) {
      const cardsContainer = el.querySelector('.column-cards') as HTMLElement;
      if (cardsContainer) {
        dnd!.registerColumn(cardsContainer, columnId);
      }
    }
  });

  // Register all cards as draggable
  const cardEls = document.querySelectorAll('.kanban-card');
  cardEls.forEach((el) => {
    const cardId = (el as HTMLElement).dataset.cardId;
    const columnId = (el as HTMLElement).dataset.columnId;
    if (cardId && columnId) {
      dnd!.registerCard(el as HTMLElement, cardId, columnId);
    }
  });
}

/**
 * Initialize the application
 */
function init(): void {
  const container = document.getElementById('board');
  if (!container) {
    console.error('Board container not found');
    return;
  }

  // Show loading state
  container.innerHTML = '<p class="loading">Loading board...</p>';

  // Signal ready to extension
  vscode.postMessage({ type: 'ready' });
}

// Expose vscode API globally for use in tiptap editor (image URL conversion)
(window as any).vscode = vscode;

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      isUpdatingFromExtension = true;
      board = parseMarkdown(message.payload.content);
      render();
      isUpdatingFromExtension = false;
      break;

    case 'update':
      // Only update if content differs (external change)
      if (board) {
        const currentMarkdown = serializeBoard(board);
        if (message.payload.content !== currentMarkdown) {
          isUpdatingFromExtension = true;
          board = parseMarkdown(message.payload.content);
          render();
          isUpdatingFromExtension = false;
        }
      }
      break;

    case 'imageUrl':
      // Dispatch custom event for image URL resolution
      window.dispatchEvent(
        new CustomEvent('image-url-resolved', {
          detail: {
            originalPath: message.payload.originalPath,
            webviewUrl: message.payload.webviewUrl,
          },
        })
      );
      break;

    case 'clipboardData':
      // Handle clipboard data from extension (for paste in contenteditable fields)
      const pasteTarget = (window as any).__pendingPasteTarget as HTMLElement | null;
      if (pasteTarget && message.payload.text) {
        const text = message.payload.text;

        // Focus the target first
        pasteTarget.focus();

        // Get current selection
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          // Move cursor to end of inserted text
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          // Fallback: append to end
          pasteTarget.textContent = (pasteTarget.textContent || '') + text;
        }

        // Trigger input event so undo stack updates
        pasteTarget.dispatchEvent(new Event('input', { bubbles: true }));

        (window as any).__pendingPasteTarget = null;
      }
      break;
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
