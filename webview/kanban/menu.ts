/**
 * Column Menu Component
 *
 * Dropdown menu for column settings (kebab menu)
 */

import { Check } from './icons';

export interface ColumnMenuOptions {
  autoComplete: boolean;
  showThumbnails: boolean;
}

export interface ColumnMenuCallbacks {
  onToggleAutoComplete: () => void;
  onToggleThumbnails: () => void;
}

/**
 * Column settings dropdown menu
 */
export class ColumnMenu {
  private menuEl: HTMLElement | null = null;
  private columnId: string;
  private options: ColumnMenuOptions;
  private callbacks: ColumnMenuCallbacks;
  private boundHandleOutsideClick: (e: MouseEvent) => void;
  private boundHandleKeydown: (e: KeyboardEvent) => void;

  constructor(columnId: string, options: ColumnMenuOptions, callbacks: ColumnMenuCallbacks) {
    this.columnId = columnId;
    this.options = options;
    this.callbacks = callbacks;
    this.boundHandleOutsideClick = this.handleOutsideClick.bind(this);
    this.boundHandleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * Show the menu anchored to the given button element
   */
  show(anchorEl: HTMLElement): void {
    // Close any existing menu
    this.hide();

    // Create menu element
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'column-menu';
    this.menuEl.dataset.columnId = this.columnId;

    // Create menu items
    const autoCompleteItem = this.createMenuItem(
      'Auto-complete items',
      this.options.autoComplete,
      () => {
        this.callbacks.onToggleAutoComplete();
        this.hide();
      }
    );

    const thumbnailsItem = this.createMenuItem(
      'Show thumbnails',
      this.options.showThumbnails,
      () => {
        this.callbacks.onToggleThumbnails();
        this.hide();
      }
    );

    this.menuEl.appendChild(autoCompleteItem);
    this.menuEl.appendChild(thumbnailsItem);

    // Position the menu
    document.body.appendChild(this.menuEl);
    this.positionMenu(anchorEl);

    // Add event listeners
    requestAnimationFrame(() => {
      document.addEventListener('click', this.boundHandleOutsideClick);
      document.addEventListener('keydown', this.boundHandleKeydown);
    });
  }

  /**
   * Hide the menu
   */
  hide(): void {
    if (this.menuEl) {
      this.menuEl.remove();
      this.menuEl = null;
    }
    document.removeEventListener('click', this.boundHandleOutsideClick);
    document.removeEventListener('keydown', this.boundHandleKeydown);
  }

  /**
   * Check if menu is currently visible
   */
  isVisible(): boolean {
    return this.menuEl !== null;
  }

  /**
   * Create a menu item with optional checkmark
   */
  private createMenuItem(
    label: string,
    checked: boolean,
    onClick: () => void
  ): HTMLElement {
    const item = document.createElement('button');
    item.className = 'column-menu-item';
    item.type = 'button';

    // Checkmark indicator
    const checkEl = document.createElement('span');
    checkEl.className = 'menu-item-check';
    if (checked) {
      checkEl.appendChild(Check({ size: 14, strokeWidth: 2.5 }));
    }
    item.appendChild(checkEl);

    // Label
    const labelEl = document.createElement('span');
    labelEl.className = 'menu-item-label';
    labelEl.textContent = label;
    item.appendChild(labelEl);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    return item;
  }

  /**
   * Position the menu below the anchor element
   */
  private positionMenu(anchorEl: HTMLElement): void {
    if (!this.menuEl) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const menuRect = this.menuEl.getBoundingClientRect();

    // Position below and aligned to the right of the anchor
    let top = anchorRect.bottom + 4;
    let left = anchorRect.right - menuRect.width;

    // Ensure menu stays within viewport
    if (left < 8) {
      left = 8;
    }
    if (top + menuRect.height > window.innerHeight - 8) {
      // Show above if not enough room below
      top = anchorRect.top - menuRect.height - 4;
    }

    this.menuEl.style.top = `${top}px`;
    this.menuEl.style.left = `${left}px`;
  }

  /**
   * Handle clicks outside the menu
   */
  private handleOutsideClick(e: MouseEvent): void {
    if (this.menuEl && !this.menuEl.contains(e.target as Node)) {
      this.hide();
    }
  }

  /**
   * Handle keyboard events
   */
  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.hide();
    }
  }
}

/**
 * Global menu manager to ensure only one menu is open at a time
 */
let activeMenu: ColumnMenu | null = null;

export function showColumnMenu(
  anchorEl: HTMLElement,
  columnId: string,
  options: ColumnMenuOptions,
  callbacks: ColumnMenuCallbacks
): void {
  // Close any existing menu
  if (activeMenu) {
    activeMenu.hide();
  }

  activeMenu = new ColumnMenu(columnId, options, callbacks);
  activeMenu.show(anchorEl);
}

export function hideColumnMenu(): void {
  if (activeMenu) {
    activeMenu.hide();
    activeMenu = null;
  }
}
