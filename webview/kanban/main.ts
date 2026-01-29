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
  type KanbanBoard,
} from './parser';
import { KanbanDragDrop, type DragEndEvent } from './dnd';
import { renderBoard, showAddCardInput, type UICallbacks } from './ui';

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
    onEditCard: (cardId) => {
      // Handled in UI component via double-click
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
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
