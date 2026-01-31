/**
 * Kanban Board UI Components
 *
 * Vanilla JavaScript rendering for the kanban board
 */

import type { KanbanBoard, KanbanColumn, KanbanCard, ColumnSettings, BoardSettings } from './parser';

interface RenderOptions {
  boardSettings?: BoardSettings;
}
import { MoreVertical } from './icons';
import { showColumnMenu } from './menu';
import { openCardModal } from './modal';

export interface UICallbacks {
  onToggleCard: (cardId: string) => void;
  onAddCard: (columnId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onCardTextChange: (cardId: string, text: string) => void;
  onCardDescriptionChange: (cardId: string, description: string) => void;
  onColumnSettingsChange: (columnId: string, settings: Partial<ColumnSettings>) => void;
  onBoardSettingsChange: (settings: Partial<BoardSettings>) => void;
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
 * Truncate text to a max number of lines (approximated by characters)
 */
function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Extract the first image URL from markdown text
 */
function extractFirstImage(markdown: string): string | null {
  // Match ![alt](url) pattern
  const match = markdown.match(/!\[[^\]]*\]\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Strip markdown formatting to get plain text for preview
 */
function stripMarkdown(text: string): string {
  return text
    // Remove backslash escapes first (e.g., \## -> ##)
    .replace(/\\([#*_~`\[\]()>-])/g, '')
    // Remove images ![alt](url)
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    // Remove links but keep text [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove bold **text** or __text__
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    // Remove italic *text* or _text_
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Remove strikethrough ~~text~~
    .replace(/~~([^~]+)~~/g, '$1')
    // Remove headers ### - match anywhere, not just line start
    .replace(/#{1,6}\s+/g, '')
    // Remove blockquotes >
    .replace(/^>\s*/gm, '')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Remove list markers - and * at start of lines
    .replace(/^[\s]*[-*+]\s+/gm, '')
    // Remove numbered list markers
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up any remaining backslashes before special chars
    .replace(/\\(.)/g, '$1')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Render a single card
 */
export function renderCard(
  card: KanbanCard,
  columnId: string,
  callbacks: UICallbacks,
  options?: RenderOptions
): HTMLElement {
  const cardEl = document.createElement('div');
  cardEl.className = `kanban-card${card.completed ? ' completed' : ''}`;
  cardEl.dataset.cardId = card.id;
  cardEl.dataset.columnId = columnId;
  cardEl.draggable = true;

  // Build card content with DOM methods
  const checkboxLabel = document.createElement('label');
  checkboxLabel.className = 'card-checkbox';
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = card.completed;
  checkboxLabel.appendChild(checkbox);

  const contentEl = document.createElement('div');
  contentEl.className = 'card-content';

  const titleEl = document.createElement('span');
  titleEl.className = 'card-title';
  titleEl.textContent = card.text;
  contentEl.appendChild(titleEl);

  // Show thumbnail if enabled (default true) and description has an image
  const showThumbnails = options?.boardSettings?.showThumbnails !== false;
  if (card.description && showThumbnails) {
    const imageUrl = extractFirstImage(card.description);
    if (imageUrl) {
      const thumbEl = document.createElement('div');
      thumbEl.className = 'card-thumbnail';
      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = '';
      img.loading = 'lazy';
      // Request URL conversion for local paths
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:') && !imageUrl.includes('vscode-resource')) {
        const vscode = (window as any).vscode;
        if (vscode) {
          vscode.postMessage({ type: 'requestImageUrl', payload: { path: imageUrl } });
          // Listen for the response
          const handler = (event: MessageEvent) => {
            if (event.data?.type === 'imageUrl' && event.data?.payload?.originalPath === imageUrl) {
              img.src = event.data.payload.webviewUrl;
              window.removeEventListener('message', handler);
            }
          };
          window.addEventListener('message', handler);
        }
      }
      thumbEl.appendChild(img);
      contentEl.appendChild(thumbEl);
    }
  }

  if (card.description) {
    const descEl = document.createElement('span');
    descEl.className = 'card-description';
    // Strip markdown and truncate for preview
    const plainText = stripMarkdown(card.description);
    descEl.textContent = truncateText(plainText, 120);
    contentEl.appendChild(descEl);
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'card-delete';
  deleteBtn.title = 'Delete task';
  deleteBtn.innerHTML = '&times;';

  cardEl.appendChild(checkboxLabel);
  cardEl.appendChild(contentEl);
  cardEl.appendChild(deleteBtn);

  // Checkbox toggle (stop propagation so it doesn't open modal)
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  checkbox.addEventListener('change', () => {
    callbacks.onToggleCard(card.id);
  });

  // Click card content to open modal
  contentEl.addEventListener('click', (e) => {
    e.stopPropagation();
    openCardModal(card, {
      onTitleChange: (title) => callbacks.onCardTextChange(card.id, title),
      onDescriptionChange: (desc) => callbacks.onCardDescriptionChange(card.id, desc),
      onClose: () => {
        // Modal closed - re-render will happen from callbacks if changes made
      },
    });
  });

  // Delete button
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onDeleteCard(card.id);
  });

  return cardEl;
}

/**
 * Render a column
 */
export function renderColumn(column: KanbanColumn, callbacks: UICallbacks, options?: RenderOptions): HTMLElement {
  const columnEl = document.createElement('div');
  columnEl.className = 'kanban-column';
  columnEl.dataset.columnId = column.id;

  // Check if this is an archive column (hide if empty)
  const isArchive = column.title.toLowerCase() === 'archive';
  if (isArchive && column.cards.length === 0) {
    columnEl.style.display = 'none';
  }

  // Build header
  const headerEl = document.createElement('div');
  headerEl.className = 'column-header';

  const titleEl = document.createElement('h3');
  titleEl.className = 'column-title';
  titleEl.textContent = column.title;

  const countEl = document.createElement('span');
  countEl.className = 'column-count';
  countEl.textContent = String(column.cards.length);

  const menuBtn = document.createElement('button');
  menuBtn.className = 'column-menu-btn';
  menuBtn.type = 'button';
  menuBtn.title = 'Column settings';
  menuBtn.appendChild(MoreVertical({ size: 16 }));

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showColumnMenu(
      menuBtn,
      column.id,
      {
        autoComplete: column.settings?.autoComplete ?? false,
      },
      {
        onToggleAutoComplete: () => {
          callbacks.onColumnSettingsChange(column.id, {
            autoComplete: !column.settings?.autoComplete,
          });
        },
      }
    );
  });

  headerEl.appendChild(titleEl);
  headerEl.appendChild(countEl);
  headerEl.appendChild(menuBtn);

  // Build cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'column-cards';

  // Build add button
  const addBtn = document.createElement('button');
  addBtn.className = 'add-card-btn';
  addBtn.textContent = '+ Add task';

  columnEl.appendChild(headerEl);
  columnEl.appendChild(cardsContainer);
  columnEl.appendChild(addBtn);

  // Render cards
  for (const card of column.cards) {
    cardsContainer.appendChild(renderCard(card, column.id, callbacks, options));
  }

  // Add card button event
  addBtn.addEventListener('click', () => {
    callbacks.onAddCard(column.id);
  });

  return columnEl;
}

/**
 * Render the entire board
 */
export function renderBoard(
  container: HTMLElement,
  board: KanbanBoard,
  callbacks: UICallbacks
): void {
  container.innerHTML = '';

  const options: RenderOptions = {
    boardSettings: board.settings,
  };

  for (const column of board.columns) {
    container.appendChild(renderColumn(column, callbacks, options));
  }
}

/**
 * Show input for adding a new card
 */
export function showAddCardInput(
  columnId: string,
  onSubmit: (text: string) => void,
  onCancel: () => void
): void {
  const columnEl = document.querySelector(`[data-column-id="${columnId}"]`);
  if (!columnEl) return;

  const cardsContainer = columnEl.querySelector('.column-cards') as HTMLElement;
  const addBtn = columnEl.querySelector('.add-card-btn') as HTMLButtonElement;

  // Create input card
  const inputCard = document.createElement('div');
  inputCard.className = 'kanban-card new-card-input';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'new-card-text';
  input.placeholder = 'Task name...';

  const actions = document.createElement('div');
  actions.className = 'new-card-actions';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'new-card-save';
  saveBtn.textContent = 'Add';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'new-card-cancel';
  cancelBtn.textContent = 'Cancel';

  actions.appendChild(saveBtn);
  actions.appendChild(cancelBtn);
  inputCard.appendChild(input);
  inputCard.appendChild(actions);

  cardsContainer.appendChild(inputCard);
  addBtn.style.display = 'none';

  input.focus();

  const cleanup = () => {
    inputCard.remove();
    addBtn.style.display = '';
  };

  const submit = () => {
    const text = input.value.trim();
    cleanup();
    if (text) {
      onSubmit(text);
    } else {
      onCancel();
    }
  };

  saveBtn.addEventListener('click', submit);
  cancelBtn.addEventListener('click', () => {
    cleanup();
    onCancel();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      cleanup();
      onCancel();
    }
  });
}
