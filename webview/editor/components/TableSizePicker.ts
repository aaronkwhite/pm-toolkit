/**
 * Table Size Picker Component
 *
 * A grid UI for selecting table dimensions (rows x columns)
 * Inspired by Notion/Word table insertion UI
 */

export interface TableSize {
  rows: number;
  cols: number;
}

export type TableSizeCallback = (size: TableSize) => void;

const MAX_ROWS = 8;
const MAX_COLS = 8;
const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/**
 * TableSizePicker - Grid UI for selecting table dimensions
 */
export class TableSizePicker {
  private element: HTMLElement;
  private gridElement: HTMLElement;
  private labelElement: HTMLElement;
  private hoveredSize: TableSize = { rows: DEFAULT_ROWS, cols: DEFAULT_COLS };
  private onSelect: TableSizeCallback | null = null;
  private onCancel: (() => void) | null = null;

  constructor() {
    console.log('[TableSizePicker] Creating picker');
    this.element = document.createElement('div');
    this.element.className = 'table-size-picker';

    // Create header
    const header = document.createElement('div');
    header.className = 'table-size-picker-header';
    header.textContent = 'Insert Table';
    this.element.appendChild(header);

    // Create grid container
    this.gridElement = document.createElement('div');
    this.gridElement.className = 'table-size-picker-grid';
    this.element.appendChild(this.gridElement);

    // Create label showing current selection
    this.labelElement = document.createElement('div');
    this.labelElement.className = 'table-size-picker-label';
    this.element.appendChild(this.labelElement);

    // Build the grid
    this.buildGrid();

    // Update initial label
    this.updateLabel();

    // Handle clicks outside
    this.element.addEventListener('click', (e) => e.stopPropagation());

    document.body.appendChild(this.element);
  }

  private buildGrid(): void {
    this.gridElement.innerHTML = '';

    for (let row = 0; row < MAX_ROWS; row++) {
      for (let col = 0; col < MAX_COLS; col++) {
        const cell = document.createElement('div');
        cell.className = 'table-size-picker-cell';
        cell.dataset.row = String(row + 1);
        cell.dataset.col = String(col + 1);

        cell.addEventListener('mouseenter', () => {
          this.hoveredSize = { rows: row + 1, cols: col + 1 };
          this.updateHighlight();
          this.updateLabel();
        });

        cell.addEventListener('click', () => {
          if (this.onSelect) {
            this.onSelect({ rows: row + 1, cols: col + 1 });
          }
          this.hide();
        });

        this.gridElement.appendChild(cell);
      }
    }
  }

  private updateHighlight(): void {
    const cells = this.gridElement.querySelectorAll('.table-size-picker-cell');
    cells.forEach((cell) => {
      const cellEl = cell as HTMLElement;
      const row = parseInt(cellEl.dataset.row || '0', 10);
      const col = parseInt(cellEl.dataset.col || '0', 10);

      if (row <= this.hoveredSize.rows && col <= this.hoveredSize.cols) {
        cellEl.classList.add('is-highlighted');
      } else {
        cellEl.classList.remove('is-highlighted');
      }
    });
  }

  private updateLabel(): void {
    this.labelElement.textContent = `${this.hoveredSize.cols} × ${this.hoveredSize.rows}`;
  }

  /**
   * Show the picker at a specific position
   */
  show(options: {
    rect: DOMRect;
    onSelect: TableSizeCallback;
    onCancel?: () => void;
  }): void {
    this.onSelect = options.onSelect;
    this.onCancel = options.onCancel || null;

    // Reset to default
    this.hoveredSize = { rows: DEFAULT_ROWS, cols: DEFAULT_COLS };
    this.updateHighlight();
    this.updateLabel();

    // Position the picker
    const pickerRect = this.element.getBoundingClientRect();
    const { innerHeight, innerWidth } = window;

    let top = options.rect.bottom + 8;
    let left = options.rect.left;

    // Flip up if near bottom
    if (top + 280 > innerHeight - 20) {
      top = options.rect.top - 280 - 8;
    }

    // Keep within horizontal bounds
    if (left + 220 > innerWidth - 20) {
      left = innerWidth - 220 - 20;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
    this.element.style.display = 'block';

    console.log('[TableSizePicker] Showing at', top, left);

    // Add keyboard and click handlers after a short delay
    // This prevents the Enter key from the slash menu from immediately selecting
    setTimeout(() => {
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('click', this.handleClickOutside);
    }, 50);
  }

  /**
   * Hide the picker
   */
  hide(): void {
    this.element.style.display = 'none';
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClickOutside);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      this.hide();
      if (this.onCancel) {
        this.onCancel();
      }
    } else if (e.key === 'Enter') {
      if (this.onSelect) {
        this.onSelect(this.hoveredSize);
      }
      this.hide();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      this.hoveredSize.cols = Math.min(this.hoveredSize.cols + 1, MAX_COLS);
      this.updateHighlight();
      this.updateLabel();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.hoveredSize.cols = Math.max(this.hoveredSize.cols - 1, 1);
      this.updateHighlight();
      this.updateLabel();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.hoveredSize.rows = Math.min(this.hoveredSize.rows + 1, MAX_ROWS);
      this.updateHighlight();
      this.updateLabel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.hoveredSize.rows = Math.max(this.hoveredSize.rows - 1, 1);
      this.updateHighlight();
      this.updateLabel();
    }
  };

  private handleClickOutside = (e: MouseEvent): void => {
    if (!this.element.contains(e.target as Node)) {
      this.hide();
      if (this.onCancel) {
        this.onCancel();
      }
    }
  };

  /**
   * Clean up
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClickOutside);
    this.element.remove();
  }
}
