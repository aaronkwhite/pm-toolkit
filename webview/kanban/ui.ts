/**
 * Kanban Board UI Components
 *
 * Vanilla JavaScript rendering for the kanban board
 */

import type { KanbanBoard, KanbanColumn, KanbanCard } from './parser';

export interface UICallbacks {
  onToggleCard: (cardId: string) => void;
  onAddCard: (columnId: string) => void;
  onEditCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onCardTextChange: (cardId: string, text: string) => void;
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
 * Render a single card
 */
export function renderCard(card: KanbanCard, columnId: string, callbacks: UICallbacks): HTMLElement {
  const cardEl = document.createElement('div');
  cardEl.className = `kanban-card${card.completed ? ' completed' : ''}`;
  cardEl.dataset.cardId = card.id;
  cardEl.dataset.columnId = columnId;
  cardEl.draggable = true;

  cardEl.innerHTML = `
    <label class="card-checkbox">
      <input type="checkbox" ${card.completed ? 'checked' : ''} />
    </label>
    <div class="card-content">
      <span class="card-title">${escapeHtml(card.text)}</span>
      ${card.description ? `<span class="card-description">${escapeHtml(card.description)}</span>` : ''}
    </div>
    <button class="card-delete" title="Delete task">&times;</button>
  `;

  // Checkbox toggle
  const checkbox = cardEl.querySelector('input[type="checkbox"]') as HTMLInputElement;
  checkbox.addEventListener('change', () => {
    callbacks.onToggleCard(card.id);
  });

  // Double-click to edit
  const titleEl = cardEl.querySelector('.card-title') as HTMLElement;
  titleEl.addEventListener('dblclick', () => {
    startEditingCard(cardEl, card, callbacks);
  });

  // Delete button
  const deleteBtn = cardEl.querySelector('.card-delete') as HTMLButtonElement;
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    callbacks.onDeleteCard(card.id);
  });

  return cardEl;
}

/**
 * Start editing a card's text inline
 */
function startEditingCard(cardEl: HTMLElement, card: KanbanCard, callbacks: UICallbacks): void {
  const titleEl = cardEl.querySelector('.card-title') as HTMLElement;
  const originalText = card.text;

  // Create input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'card-edit-input';
  input.value = originalText;

  // Replace title with input
  titleEl.style.display = 'none';
  titleEl.parentElement?.insertBefore(input, titleEl);
  input.focus();
  input.select();

  const finishEditing = (save: boolean) => {
    const newText = input.value.trim();
    input.remove();
    titleEl.style.display = '';

    if (save && newText && newText !== originalText) {
      callbacks.onCardTextChange(card.id, newText);
    }
  };

  input.addEventListener('blur', () => finishEditing(true));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEditing(true);
    } else if (e.key === 'Escape') {
      finishEditing(false);
    }
  });
}

/**
 * Render a column
 */
export function renderColumn(column: KanbanColumn, callbacks: UICallbacks): HTMLElement {
  const columnEl = document.createElement('div');
  columnEl.className = 'kanban-column';
  columnEl.dataset.columnId = column.id;

  // Check if this is an archive column (hide if empty)
  const isArchive = column.title.toLowerCase() === 'archive';
  if (isArchive && column.cards.length === 0) {
    columnEl.style.display = 'none';
  }

  columnEl.innerHTML = `
    <div class="column-header">
      <h3 class="column-title">${escapeHtml(column.title)}</h3>
      <span class="column-count">${column.cards.length}</span>
    </div>
    <div class="column-cards"></div>
    <button class="add-card-btn">+ Add task</button>
  `;

  // Render cards
  const cardsContainer = columnEl.querySelector('.column-cards') as HTMLElement;
  for (const card of column.cards) {
    cardsContainer.appendChild(renderCard(card, column.id, callbacks));
  }

  // Add card button
  const addBtn = columnEl.querySelector('.add-card-btn') as HTMLButtonElement;
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

  for (const column of board.columns) {
    container.appendChild(renderColumn(column, callbacks));
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
  inputCard.innerHTML = `
    <input type="text" class="new-card-text" placeholder="Task name..." />
    <div class="new-card-actions">
      <button class="new-card-save">Add</button>
      <button class="new-card-cancel">Cancel</button>
    </div>
  `;

  cardsContainer.appendChild(inputCard);
  addBtn.style.display = 'none';

  const input = inputCard.querySelector('.new-card-text') as HTMLInputElement;
  const saveBtn = inputCard.querySelector('.new-card-save') as HTMLButtonElement;
  const cancelBtn = inputCard.querySelector('.new-card-cancel') as HTMLButtonElement;

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
