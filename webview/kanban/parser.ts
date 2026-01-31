/**
 * Kanban Board Markdown Parser
 *
 * Converts markdown to board structure and back.
 *
 * Format:
 * ## Column Name
 *
 * - [ ] Task text
 *   Optional description
 *
 * - [x] Completed task
 */

export interface KanbanCard {
  id: string;
  text: string;
  description: string;
  completed: boolean;
}

export interface ColumnSettings {
  autoComplete?: boolean;
}

export interface BoardSettings {
  showThumbnails?: boolean; // Default true - show first image as card thumbnail
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  settings?: ColumnSettings;
}

export interface KanbanBoard {
  preamble: string; // Content before first column
  columns: KanbanColumn[];
  settings?: BoardSettings;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse column title and extract settings
 * Format: "Title [auto-complete]" or just "Title"
 */
function parseColumnTitle(rawTitle: string): { title: string; settings?: ColumnSettings } {
  let title = rawTitle;
  const settings: ColumnSettings = {};

  // Parse [auto-complete]
  if (/\[auto-complete\]/i.test(title)) {
    settings.autoComplete = true;
    title = title.replace(/\s*\[auto-complete\]\s*/gi, ' ').trim();
  }

  if (Object.keys(settings).length > 0) {
    return { title, settings };
  }

  return { title };
}

/**
 * Parse board settings from preamble
 * Format: [no-thumbnails] on its own line
 */
function parseBoardSettings(preamble: string): { cleanPreamble: string; settings?: BoardSettings } {
  let cleanPreamble = preamble;
  const settings: BoardSettings = {};

  // Parse [no-thumbnails]
  if (/\[no-thumbnails\]/i.test(cleanPreamble)) {
    settings.showThumbnails = false;
    cleanPreamble = cleanPreamble.replace(/\s*\[no-thumbnails\]\s*/gi, '\n').trim();
  }

  if (Object.keys(settings).length > 0) {
    return { cleanPreamble, settings };
  }

  return { cleanPreamble };
}

/**
 * Serialize column title with settings
 */
function serializeColumnTitle(column: KanbanColumn): string {
  let title = column.title;
  if (column.settings?.autoComplete) {
    title += ' [auto-complete]';
  }
  return title;
}

/**
 * Parse markdown into a KanbanBoard structure
 */
export function parseMarkdown(markdown: string): KanbanBoard {
  const lines = markdown.split('\n');
  const board: KanbanBoard = {
    preamble: '',
    columns: [],
  };

  let currentColumn: KanbanColumn | null = null;
  let currentCard: KanbanCard | null = null;
  let preambleLines: string[] = [];
  let inPreamble = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for column heading (## Title or ## Title [auto-complete])
    const columnMatch = line.match(/^##\s+(.+)$/);
    if (columnMatch) {
      // Save any pending card
      if (currentCard && currentColumn) {
        currentCard.description = currentCard.description.trim();
        currentColumn.cards.push(currentCard);
        currentCard = null;
      }

      // Parse title and settings
      const rawTitle = columnMatch[1].trim();
      const { title, settings } = parseColumnTitle(rawTitle);

      // Start new column
      inPreamble = false;
      currentColumn = {
        id: generateId(),
        title,
        cards: [],
        settings,
      };
      board.columns.push(currentColumn);
      continue;
    }

    // Check for task item (- [ ] or - [x])
    const taskMatch = line.match(/^-\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch && currentColumn) {
      // Save any pending card
      if (currentCard) {
        currentCard.description = currentCard.description.trim();
        currentColumn.cards.push(currentCard);
      }

      // Start new card
      currentCard = {
        id: generateId(),
        text: taskMatch[2].trim(),
        description: '',
        completed: taskMatch[1].toLowerCase() === 'x',
      };
      continue;
    }

    // Check for description (indented text after a card)
    if (currentCard && line.match(/^\s{2,}/) && line.trim()) {
      currentCard.description += (currentCard.description ? '\n' : '') + line.trim();
      continue;
    }

    // Preamble content (before first column)
    if (inPreamble) {
      preambleLines.push(line);
    }
  }

  // Save any remaining card
  if (currentCard && currentColumn) {
    currentCard.description = currentCard.description.trim();
    currentColumn.cards.push(currentCard);
  }

  // Clean up preamble (remove trailing empty lines)
  while (preambleLines.length > 0 && preambleLines[preambleLines.length - 1].trim() === '') {
    preambleLines.pop();
  }

  // Parse board settings from preamble
  const rawPreamble = preambleLines.join('\n');
  const { cleanPreamble, settings: boardSettings } = parseBoardSettings(rawPreamble);
  board.preamble = cleanPreamble;
  board.settings = boardSettings;

  // If no columns found, create default columns
  if (board.columns.length === 0) {
    board.columns = [
      { id: generateId(), title: 'To Do', cards: [] },
      { id: generateId(), title: 'In Progress', cards: [] },
      { id: generateId(), title: 'Done', cards: [] },
    ];
  }

  return board;
}

/**
 * Serialize a KanbanBoard back to markdown
 */
export function serializeBoard(board: KanbanBoard): string {
  const lines: string[] = [];

  // Add board settings
  if (board.settings?.showThumbnails === false) {
    lines.push('[no-thumbnails]');
    lines.push('');
  }

  // Add preamble if present
  if (board.preamble.trim()) {
    lines.push(board.preamble);
    lines.push('');
  }

  // Serialize each column
  for (const column of board.columns) {
    lines.push(`## ${serializeColumnTitle(column)}`);
    lines.push('');

    for (const card of column.cards) {
      const checkbox = card.completed ? '[x]' : '[ ]';
      lines.push(`- ${checkbox} ${card.text}`);

      // Add description with indentation
      if (card.description) {
        const descLines = card.description.split('\n');
        for (const descLine of descLines) {
          lines.push(`  ${descLine}`);
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim() + '\n';
}

/**
 * Move a card from one position to another
 */
export function moveCard(
  board: KanbanBoard,
  cardId: string,
  toColumnId: string,
  toIndex: number
): KanbanBoard {
  // Find and remove the card from its current position
  let movedCard: KanbanCard | null = null;

  for (const column of board.columns) {
    const cardIndex = column.cards.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) {
      movedCard = column.cards.splice(cardIndex, 1)[0];
      break;
    }
  }

  if (!movedCard) {
    return board;
  }

  // Find the target column and insert the card
  const targetColumn = board.columns.find((c) => c.id === toColumnId);
  if (targetColumn) {
    // Auto-complete if column has autoComplete setting enabled
    if (targetColumn.settings?.autoComplete) {
      movedCard.completed = true;
    }

    targetColumn.cards.splice(toIndex, 0, movedCard);
  }

  return board;
}

/**
 * Toggle a card's completion state
 */
export function toggleCard(board: KanbanBoard, cardId: string): KanbanBoard {
  for (const column of board.columns) {
    const card = column.cards.find((c) => c.id === cardId);
    if (card) {
      card.completed = !card.completed;
      break;
    }
  }
  return board;
}

/**
 * Add a new card to a column
 */
export function addCard(
  board: KanbanBoard,
  columnId: string,
  text: string,
  atIndex?: number
): KanbanBoard {
  const column = board.columns.find((c) => c.id === columnId);
  if (column) {
    const newCard: KanbanCard = {
      id: generateId(),
      text,
      description: '',
      completed: false,
    };

    if (atIndex !== undefined) {
      column.cards.splice(atIndex, 0, newCard);
    } else {
      column.cards.push(newCard);
    }
  }
  return board;
}

/**
 * Update a card's text
 */
export function updateCard(
  board: KanbanBoard,
  cardId: string,
  updates: Partial<Pick<KanbanCard, 'text' | 'description'>>
): KanbanBoard {
  for (const column of board.columns) {
    const card = column.cards.find((c) => c.id === cardId);
    if (card) {
      if (updates.text !== undefined) {
        card.text = updates.text;
      }
      if (updates.description !== undefined) {
        card.description = updates.description;
      }
      break;
    }
  }
  return board;
}

/**
 * Delete a card from the board
 */
export function deleteCard(board: KanbanBoard, cardId: string): KanbanBoard {
  for (const column of board.columns) {
    const cardIndex = column.cards.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) {
      column.cards.splice(cardIndex, 1);
      break;
    }
  }
  return board;
}

/**
 * Update column settings
 */
export function updateColumnSettings(
  board: KanbanBoard,
  columnId: string,
  settings: Partial<ColumnSettings>
): KanbanBoard {
  const column = board.columns.find((c) => c.id === columnId);
  if (column) {
    column.settings = { ...column.settings, ...settings };
  }
  return board;
}

/**
 * Update board-level settings
 */
export function updateBoardSettings(
  board: KanbanBoard,
  settings: Partial<BoardSettings>
): KanbanBoard {
  board.settings = { ...board.settings, ...settings };
  return board;
}

/**
 * Add a new column to the board
 */
export function addColumn(board: KanbanBoard, title: string, atIndex?: number): KanbanBoard {
  const newColumn: KanbanColumn = {
    id: generateId(),
    title,
    cards: [],
  };

  if (atIndex !== undefined) {
    board.columns.splice(atIndex, 0, newColumn);
  } else {
    board.columns.push(newColumn);
  }

  return board;
}
