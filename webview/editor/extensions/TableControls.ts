/**
 * Table Controls Extension
 *
 * Adds full-width/full-height pill bars to add columns and rows to tables,
 * row/column grip handles for drag-to-reorder, and a context menu on grip click.
 * - Hover over a table cell: shows one row grip (left) and one column grip (top)
 * - Drag a gripper to reorder rows/columns
 * - Click a gripper to open a context menu with row/column operations
 * - Add-row/add-column bars appear only when hovering the last row/column
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';
import {
  moveTableRow,
  moveTableColumn,
  findTable,
  TableMap,
} from 'prosemirror-tables';
import { createElement as lucideCreateElement, Plus } from 'lucide';

const GRIP_V_SVG = `<svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor"><circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/><circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/><circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/></svg>`;
const GRIP_H_SVG = `<svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><circle cx="1.5" cy="1.5" r="1"/><circle cx="1.5" cy="4.5" r="1"/><circle cx="5" cy="1.5" r="1"/><circle cx="5" cy="4.5" r="1"/><circle cx="8.5" cy="1.5" r="1"/><circle cx="8.5" cy="4.5" r="1"/></svg>`;

// --- Menu item definitions ---

interface MenuItem {
  label: string;
  action: string;
  separator?: never;
}
interface MenuSeparator {
  separator: true;
  label?: never;
  action?: never;
}
type MenuEntry = MenuItem | MenuSeparator;

const ROW_MENU: MenuEntry[] = [
  { label: 'Insert row above', action: 'insertRowAbove' },
  { label: 'Insert row below', action: 'insertRowBelow' },
  { separator: true },
  { label: 'Move row up', action: 'moveRowUp' },
  { label: 'Move row down', action: 'moveRowDown' },
  { separator: true },
  { label: 'Duplicate row', action: 'duplicateRow' },
  { separator: true },
  { label: 'Delete row', action: 'deleteRow' },
];

const COL_MENU: MenuEntry[] = [
  { label: 'Insert column left', action: 'insertColLeft' },
  { label: 'Insert column right', action: 'insertColRight' },
  { separator: true },
  { label: 'Move column left', action: 'moveColLeft' },
  { label: 'Move column right', action: 'moveColRight' },
  { separator: true },
  { label: 'Duplicate column', action: 'duplicateCol' },
  { separator: true },
  { label: 'Delete column', action: 'deleteCol' },
];

export const TableControls = Extension.create({
  name: 'tableControls',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let currentTable: HTMLElement | null = null;
    let columnBar: HTMLElement | null = null;
    let rowBar: HTMLElement | null = null;
    let rowGrip: HTMLElement | null = null;
    let colGrip: HTMLElement | null = null;
    let activeRowIndex = -1;
    let activeColIndex = -1;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let isDragging = false;
    let contextMenu: HTMLElement | null = null;

    // --- Helpers ---

    /** Place editor selection inside a specific cell of the current table. */
    const focusCellAt = (rowIdx: number, colIdx: number) => {
      if (!currentTable) return;
      const rows = currentTable.querySelectorAll('tr');
      const row = rows[rowIdx];
      if (!row) return;
      const cells = row.querySelectorAll('td, th');
      const cell = cells[colIdx] as HTMLElement | undefined;
      if (!cell) return;
      try {
        const pos = editor.view.posAtDOM(cell, 0) + 1;
        editor.chain().focus().setTextSelection(pos).run();
      } catch {
        // cell not in PM DOM
      }
    };

    /** Focus the active row/column so tiptap commands operate on it. */
    const focusActiveCell = () => {
      const r = activeRowIndex >= 0 ? activeRowIndex : 0;
      const c = activeColIndex >= 0 ? activeColIndex : 0;
      focusCellAt(r, c);
    };

    /** Clear PM CellSelection (the blue .selectedCell background) and browser text selection. */
    const clearCellSelection = () => {
      const { state, dispatch } = editor.view;
      if (!(state.selection instanceof TextSelection)) {
        const pos = state.selection.$from.pos;
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, pos)));
      }
      window.getSelection()?.removeAllRanges();
      (editor.view.dom as HTMLElement).blur();
    };

    const createBar = (className: string, title: string): HTMLElement => {
      const bar = document.createElement('button');
      bar.className = className;
      const plusSvg = lucideCreateElement(Plus) as SVGSVGElement;
      plusSvg.setAttribute('width', '10');
      plusSvg.setAttribute('height', '10');
      plusSvg.setAttribute('stroke-width', '2.5');
      bar.appendChild(plusSvg);
      bar.title = title;
      bar.contentEditable = 'false';
      bar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      return bar;
    };

    const createGripEl = (className: string, svg: string): HTMLElement => {
      const grip = document.createElement('button');
      grip.className = className;
      grip.innerHTML = svg;
      grip.contentEditable = 'false';
      grip.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      return grip;
    };

    const positionBars = (table: HTMLElement) => {
      if (!columnBar || !rowBar) return;
      const tableRect = table.getBoundingClientRect();

      rowBar.style.left = `${tableRect.left}px`;
      rowBar.style.top = `${tableRect.bottom + 4}px`;
      rowBar.style.width = `${tableRect.width}px`;

      columnBar.style.left = `${tableRect.right + 4}px`;
      columnBar.style.top = `${tableRect.top}px`;
      columnBar.style.height = `${tableRect.height}px`;
    };

    const positionGrips = (table: HTMLElement) => {
      const tableRect = table.getBoundingClientRect();

      if (rowGrip && activeRowIndex >= 0) {
        const rows = table.querySelectorAll('tr');
        const row = rows[activeRowIndex];
        if (row) {
          const rect = row.getBoundingClientRect();
          rowGrip.style.left = `${tableRect.left - 14}px`;
          rowGrip.style.top = `${rect.top}px`;
          rowGrip.style.height = `${rect.height}px`;
        }
      }

      if (colGrip && activeColIndex >= 0) {
        const headerCells = table.querySelectorAll('tr:first-child th, tr:first-child td');
        const cell = headerCells[activeColIndex] as HTMLElement | undefined;
        if (cell) {
          const rect = cell.getBoundingClientRect();
          colGrip.style.left = `${rect.left}px`;
          colGrip.style.top = `${tableRect.top - 14}px`;
          colGrip.style.width = `${rect.width}px`;
        }
      }
    };

    const updateBarsForCell = () => {
      if (!currentTable) return;
      const rows = currentTable.querySelectorAll('tr');
      const headerCells = currentTable.querySelectorAll('tr:first-child th, tr:first-child td');

      if (activeRowIndex === rows.length - 1) {
        rowBar?.classList.add('visible');
      } else {
        rowBar?.classList.remove('visible');
      }

      if (activeColIndex === headerCells.length - 1) {
        columnBar?.classList.add('visible');
      } else {
        columnBar?.classList.remove('visible');
      }
    };

    const clearHideTimeout = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    const scheduleHide = () => {
      if (isDragging || contextMenu) return;
      clearHideTimeout();
      hideTimeout = setTimeout(hideControls, 150);
    };

    // --- Context menu ---

    let menuDismissListener: ((e: MouseEvent) => void) | null = null;
    let menuKeyListener: ((e: KeyboardEvent) => void) | null = null;
    let selectionHighlight: HTMLElement | null = null;
    let menuGripType: 'row' | 'column' | null = null;
    let highlightDismissListener: ((e: MouseEvent) => void) | null = null;

    /** Register a click listener that dismisses the selection highlight on next click. */
    const registerHighlightDismiss = () => {
      if (highlightDismissListener) {
        document.removeEventListener('pointerdown', highlightDismissListener, true);
      }
      highlightDismissListener = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.table-row-grip, .table-col-grip')) return;
        removeHighlight(); // also cleans up this listener
      };
      document.addEventListener('pointerdown', highlightDismissListener, true);
    };

    const removeHighlight = () => {
      selectionHighlight?.remove();
      selectionHighlight = null;
      rowGrip?.classList.remove('active');
      colGrip?.classList.remove('active');
      menuGripType = null;
      if (highlightDismissListener) {
        document.removeEventListener('pointerdown', highlightDismissListener, true);
        highlightDismissListener = null;
      }
    };

    const showHighlight = (type: 'row' | 'column') => {
      if (!currentTable) return;
      removeHighlight();
      menuGripType = type;

      const tableRect = currentTable.getBoundingClientRect();
      const hl = document.createElement('div');
      hl.className = 'table-selection-highlight';

      // Clamp highlight to the tableWrapper scroll container (handles overflow-x)
      // and the editor scroll container (handles overflow-y)
      const wrapperEl = currentTable.closest('.tableWrapper');
      const editorEl = editor.view.dom.closest('.ProseMirror') || editor.view.dom;
      const wrapperRect = wrapperEl ? wrapperEl.getBoundingClientRect() : null;
      const editorRect = editorEl.getBoundingClientRect();

      // Use the tighter of the wrapper and editor bounds (intersect them)
      const clipTop = Math.max(0, editorRect.top, wrapperRect ? wrapperRect.top : 0);
      const clipBottom = Math.min(window.innerHeight, editorRect.bottom, wrapperRect ? wrapperRect.bottom : window.innerHeight);
      const clipLeft = Math.max(0, wrapperRect ? wrapperRect.left : editorRect.left);
      const clipRight = Math.min(window.innerWidth, wrapperRect ? wrapperRect.right : editorRect.right);

      if (type === 'row') {
        const rows = currentTable.querySelectorAll('tr');
        const row = rows[activeRowIndex];
        if (!row) return;
        const rowRect = row.getBoundingClientRect();
        const top = Math.max(clipTop, rowRect.top);
        const bottom = Math.min(clipBottom, rowRect.bottom);
        const left = Math.max(clipLeft, tableRect.left);
        const right = Math.min(clipRight, tableRect.right);
        if (bottom <= top || right <= left) return;
        hl.style.left = `${left}px`;
        hl.style.top = `${top}px`;
        hl.style.width = `${right - left}px`;
        hl.style.height = `${bottom - top}px`;
        rowGrip?.classList.add('active');
      } else {
        const headerCells = currentTable.querySelectorAll('tr:first-child th, tr:first-child td');
        const cell = headerCells[activeColIndex] as HTMLElement | undefined;
        if (!cell) return;
        const cellRect = cell.getBoundingClientRect();
        const top = Math.max(clipTop, tableRect.top);
        const bottom = Math.min(clipBottom, tableRect.bottom);
        const left = Math.max(clipLeft, cellRect.left);
        const right = Math.min(clipRight, cellRect.right);
        if (bottom <= top || right <= left) return;
        hl.style.left = `${left}px`;
        hl.style.top = `${top}px`;
        hl.style.width = `${right - left}px`;
        hl.style.height = `${bottom - top}px`;
        colGrip?.classList.add('active');
      }

      document.body.appendChild(hl);
      selectionHighlight = hl;
    };

    const closeContextMenu = (keepHighlight = false) => {
      contextMenu?.remove();
      contextMenu = null;
      if (!keepHighlight) {
        removeHighlight();
      } else if (selectionHighlight) {
        // Register dismiss-on-click for the existing highlight
        registerHighlightDismiss();
      }
      if (menuDismissListener) {
        document.removeEventListener('pointerdown', menuDismissListener, true);
        menuDismissListener = null;
      }
      if (menuKeyListener) {
        document.removeEventListener('keydown', menuKeyListener, true);
        menuKeyListener = null;
      }
    };

    const openContextMenu = (type: 'row' | 'column', clickX: number, clickY: number) => {
      closeContextMenu();

      showHighlight(type);
      clearCellSelection();

      const menu = document.createElement('div');
      menu.className = 'table-grip-menu';
      const isHeaderRow = type === 'row' && activeRowIndex === 0;
      const hasHeader = isHeaderRow && currentTable
        ? currentTable.querySelector('tr:first-child th') !== null
        : false;

      // Build menu items — inject header row toggle when on the header
      let items: MenuEntry[];
      if (isHeaderRow) {
        items = [
          { label: 'Header row', action: 'toggleHeaderRow' },
          { separator: true },
          ...ROW_MENU,
        ];
      } else {
        items = type === 'row' ? ROW_MENU : COL_MENU;
      }

      items.forEach((entry) => {
        if (entry.separator) {
          const sep = document.createElement('div');
          sep.className = 'table-grip-menu-separator';
          menu.appendChild(sep);
          return;
        }
        const disabled = isHeaderRow && (
          entry.action === 'insertRowAbove' ||
          entry.action === 'moveRowUp' ||
          entry.action === 'deleteRow'
        );
        const isToggle = entry.action === 'toggleHeaderRow';
        const btn = document.createElement('button');
        btn.className = 'table-grip-menu-item';
        if (disabled) btn.classList.add('disabled');
        if (isToggle && hasHeader) btn.classList.add('checked');
        btn.textContent = entry.label!;
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
        });
        btn.addEventListener('pointerup', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          const isMoveAction = entry.action!.startsWith('move');
          executeMenuAction(type, entry.action!);
          // Move actions re-show the highlight after PM re-renders,
          // so close the menu without removing it
          closeContextMenu(isMoveAction);
          // Clear PM cell selection and browser text selection after the action
          requestAnimationFrame(() => {
            clearCellSelection();
          });
        });
        menu.appendChild(btn);
      });

      document.body.appendChild(menu);
      contextMenu = menu;

      // Position at click location
      menu.style.left = `${clickX}px`;
      menu.style.top = `${clickY}px`;

      // Clamp to viewport
      requestAnimationFrame(() => {
        if (!contextMenu) return;
        const menuRect = contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
          contextMenu.style.left = `${window.innerWidth - menuRect.width - 8}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
          contextMenu.style.top = `${clickY - menuRect.height}px`;
        }
      });

      // Close on click outside or Escape (capture phase, next tick)
      requestAnimationFrame(() => {
        menuDismissListener = (e: MouseEvent) => {
          if (contextMenu && !contextMenu.contains(e.target as Node)) {
            closeContextMenu();
          }
        };
        menuKeyListener = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeContextMenu(true);
          }
        };
        document.addEventListener('pointerdown', menuDismissListener, true);
        document.addEventListener('keydown', menuKeyListener, true);
      });
    };

    /** Get a ProseMirror position inside the active cell for chaining commands. */
    const getActiveCellPos = (): number | null => {
      if (!currentTable) return null;
      const r = activeRowIndex >= 0 ? activeRowIndex : 0;
      const c = activeColIndex >= 0 ? activeColIndex : 0;
      const rows = currentTable.querySelectorAll('tr');
      const row = rows[r];
      if (!row) return null;
      const cells = row.querySelectorAll('td, th');
      const cell = cells[c] as HTMLElement | undefined;
      if (!cell) return null;
      // posAtDOM on the cell element gives us a position just inside the cell node,
      // then +1 to land inside the cell's content (paragraph).
      try {
        const pos = editor.view.posAtDOM(cell, 0);
        return pos + 1;
      } catch {
        return null;
      }
    };

    const executeMenuAction = (type: 'row' | 'column', action: string) => {
      if (!currentTable) return;

      const pos = getActiveCellPos();
      if (pos == null) return;

      const rows = currentTable.querySelectorAll('tr');
      const totalRows = rows.length;
      const headerCells = currentTable.querySelectorAll('tr:first-child th, tr:first-child td');
      const totalCols = headerCells.length;

      // Helper: focus active cell then run a tiptap command in one chain
      const focusThen = (cmd: (chain: ReturnType<typeof editor.chain>) => ReturnType<typeof editor.chain>) => {
        cmd(editor.chain().focus().setTextSelection(pos)).run();
      };

      switch (action) {
        // --- Row actions ---
        case 'insertRowAbove':
          focusThen((c) => c.addRowBefore());
          break;
        case 'insertRowBelow':
          focusThen((c) => c.addRowAfter());
          break;
        case 'moveRowUp':
          if (activeRowIndex > 1) {
            focusActiveCell();
            runMoveCommand('row', activeRowIndex, activeRowIndex - 1);
            activeRowIndex = activeRowIndex - 1;
            requestAnimationFrame(() => {
              if (!currentTable) return;
              positionGrips(currentTable);
              showHighlight('row');
              registerHighlightDismiss();
            });
          }
          break;
        case 'moveRowDown':
          if (activeRowIndex < totalRows - 1) {
            focusActiveCell();
            runMoveCommand('row', activeRowIndex, activeRowIndex + 1);
            activeRowIndex = activeRowIndex + 1;
            requestAnimationFrame(() => {
              if (!currentTable) return;
              positionGrips(currentTable);
              showHighlight('row');
              registerHighlightDismiss();
            });
          }
          break;
        case 'duplicateRow':
          focusActiveCell();
          duplicateRow(activeRowIndex);
          break;
        case 'deleteRow':
          focusThen((c) => c.deleteRow());
          break;
        case 'toggleHeaderRow':
          focusThen((c) => c.toggleHeaderRow());
          break;

        // --- Column actions ---
        case 'insertColLeft':
          focusThen((c) => c.addColumnBefore());
          break;
        case 'insertColRight':
          focusThen((c) => c.addColumnAfter());
          break;
        case 'moveColLeft':
          if (activeColIndex > 0) {
            focusActiveCell();
            runMoveCommand('column', activeColIndex, activeColIndex - 1);
            activeColIndex = activeColIndex - 1;
            requestAnimationFrame(() => {
              if (!currentTable) return;
              positionGrips(currentTable);
              showHighlight('column');
              registerHighlightDismiss();
            });
          }
          break;
        case 'moveColRight':
          if (activeColIndex < totalCols - 1) {
            focusActiveCell();
            runMoveCommand('column', activeColIndex, activeColIndex + 1);
            activeColIndex = activeColIndex + 1;
            requestAnimationFrame(() => {
              if (!currentTable) return;
              positionGrips(currentTable);
              showHighlight('column');
              registerHighlightDismiss();
            });
          }
          break;
        case 'duplicateCol':
          focusActiveCell();
          duplicateColumn(activeColIndex);
          break;
        case 'deleteCol':
          focusThen((c) => c.deleteColumn());
          break;
      }
    };

    const runMoveCommand = (type: 'row' | 'column', from: number, to: number) => {
      editor.commands.command(({ state, dispatch }) => {
        if (type === 'row') {
          return moveTableRow({ from, to })(state, dispatch);
        } else {
          return moveTableColumn({ from, to })(state, dispatch);
        }
      });
    };

    const duplicateRow = (rowIndex: number) => {
      editor.commands.command(({ state, dispatch }) => {
        const $pos = state.selection.$from;
        const table = findTable($pos);
        if (!table) return false;
        const tableNode = table.node;
        const map = TableMap.get(tableNode);
        if (rowIndex < 0 || rowIndex >= map.height) return false;

        // Get the row node and create a deep copy
        const sourceRow = tableNode.child(rowIndex);
        const newCells: any[] = [];
        sourceRow.forEach((cell) => {
          // Copy cell with its content
          newCells.push(cell.type.create(cell.attrs, cell.content, cell.marks));
        });
        const newRow = sourceRow.type.create(sourceRow.attrs, Fragment.from(newCells));

        // Build new table rows array
        const rows: any[] = [];
        tableNode.forEach((row) => rows.push(row));
        rows.splice(rowIndex + 1, 0, newRow);

        const newTable = tableNode.type.create(tableNode.attrs, Fragment.from(rows));
        if (dispatch) {
          const tr = state.tr;
          tr.replaceWith(table.pos, table.pos + tableNode.nodeSize, newTable);
          dispatch(tr);
        }
        return true;
      });
    };

    const duplicateColumn = (colIndex: number) => {
      editor.commands.command(({ state, dispatch }) => {
        const $pos = state.selection.$from;
        const table = findTable($pos);
        if (!table) return false;
        const tableNode = table.node;
        const map = TableMap.get(tableNode);
        if (colIndex < 0 || colIndex >= map.width) return false;

        // Build new table with duplicated column
        const newRows: any[] = [];
        for (let r = 0; r < map.height; r++) {
          const row = tableNode.child(r);
          const newCells: any[] = [];
          let col = 0;
          row.forEach((cell) => {
            newCells.push(cell);
            if (col === colIndex) {
              // Duplicate this cell
              newCells.push(cell.type.create(cell.attrs, cell.content, cell.marks));
            }
            col++;
          });
          newRows.push(row.type.create(row.attrs, Fragment.from(newCells)));
        }

        const newTable = tableNode.type.create(tableNode.attrs, Fragment.from(newRows));
        if (dispatch) {
          const tr = state.tr;
          tr.replaceWith(table.pos, table.pos + tableNode.nodeSize, newTable);
          dispatch(tr);
        }
        return true;
      });
    };

    // --- Grip visibility based on hovered cell ---

    const updateGripsForCell = (cell: HTMLElement) => {
      if (!currentTable) return;

      const row = cell.closest('tr');
      if (!row) return;
      const rows = currentTable.querySelectorAll('tr');
      let rowIdx = -1;
      rows.forEach((r, i) => { if (r === row) rowIdx = i; });

      const cellsInRow = row.querySelectorAll('td, th');
      let colIdx = -1;
      cellsInRow.forEach((c, i) => { if (c === cell) colIdx = i; });

      const tableRect = currentTable.getBoundingClientRect();

      // Row grip: show for all rows including the header
      if (rowIdx >= 0 && rowIdx !== activeRowIndex) {
        activeRowIndex = rowIdx;
        if (!rowGrip) {
          rowGrip = createGripEl('table-row-grip', GRIP_V_SVG);
          rowGrip.addEventListener('mouseenter', clearHideTimeout);
          rowGrip.addEventListener('mouseleave', scheduleHide);
          rowGrip.addEventListener('pointerdown', (e) => onGripPointerDown(e, 'row'));
          document.body.appendChild(rowGrip);
        }
        const rect = row.getBoundingClientRect();
        rowGrip.style.left = `${tableRect.left - 14}px`;
        rowGrip.style.top = `${rect.top}px`;
        rowGrip.style.height = `${rect.height}px`;
        rowGrip.classList.add('visible');
      }

      // Column grip
      if (colIdx >= 0 && colIdx !== activeColIndex) {
        activeColIndex = colIdx;
        if (!colGrip) {
          colGrip = createGripEl('table-col-grip', GRIP_H_SVG);
          colGrip.addEventListener('mouseenter', clearHideTimeout);
          colGrip.addEventListener('mouseleave', scheduleHide);
          colGrip.addEventListener('pointerdown', (e) => onGripPointerDown(e, 'column'));
          document.body.appendChild(colGrip);
        }
        const headerCells = currentTable.querySelectorAll('tr:first-child th, tr:first-child td');
        const headerCell = headerCells[colIdx] as HTMLElement | undefined;
        if (headerCell) {
          const rect = headerCell.getBoundingClientRect();
          colGrip.style.left = `${rect.left}px`;
          colGrip.style.top = `${tableRect.top - 14}px`;
          colGrip.style.width = `${rect.width}px`;
        }
        colGrip.classList.add('visible');
      }

      updateBarsForCell();
    };

    const hideGrips = () => {
      rowGrip?.remove();
      colGrip?.remove();
      rowGrip = null;
      colGrip = null;
      activeRowIndex = -1;
      activeColIndex = -1;
    };

    // --- Grip pointer handling: click → menu, drag → reorder ---

    const DRAG_THRESHOLD = 4;

    const onGripPointerDown = (e: PointerEvent, type: 'row' | 'column') => {
      e.preventDefault();
      const fromIndex = type === 'row' ? activeRowIndex : activeColIndex;
      if (fromIndex < 0) return;

      const grip = e.currentTarget as HTMLElement;
      grip.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      let didDrag = false;
      let indicator: HTMLElement | null = null;
      let dropGrip: HTMLElement | null = null;
      let toIndex = fromIndex;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!didDrag && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return;

        if (!didDrag) {
          // Transition to drag mode
          didDrag = true;
          isDragging = true;
          grip.classList.add('dragging', 'active');
          closeContextMenu();
          indicator = document.createElement('div');
          indicator.className = `table-drop-indicator ${type}`;
          document.body.appendChild(indicator);

          // Create a ghost grip at drop target
          const gripClass = type === 'row' ? 'table-row-grip' : 'table-col-grip';
          const gripSvg = type === 'row' ? GRIP_V_SVG : GRIP_H_SVG;
          dropGrip = createGripEl(gripClass, gripSvg);
          dropGrip.classList.add('visible', 'active');
          dropGrip.style.pointerEvents = 'none';
          document.body.appendChild(dropGrip);
        }

        const table = currentTable!;
        const tableRect = table.getBoundingClientRect();

        if (type === 'row') {
          const rows = table.querySelectorAll('tr');
          let bestIndex = fromIndex;
          let bestDist = Infinity;
          for (let i = 1; i <= rows.length; i++) {
            const boundaryY = i < rows.length
              ? rows[i].getBoundingClientRect().top
              : rows[rows.length - 1].getBoundingClientRect().bottom;
            const dist = Math.abs(ev.clientY - boundaryY);
            if (dist < bestDist) {
              bestDist = dist;
              bestIndex = i;
            }
          }
          toIndex = bestIndex > fromIndex ? bestIndex - 1 : bestIndex;
          toIndex = Math.max(1, Math.min(toIndex, rows.length - 1));

          const indicatorY = bestIndex < rows.length
            ? rows[bestIndex].getBoundingClientRect().top
            : rows[rows.length - 1].getBoundingClientRect().bottom;
          indicator!.style.left = `${tableRect.left}px`;
          indicator!.style.top = `${indicatorY - 1}px`;
          indicator!.style.width = `${tableRect.width}px`;

          // Position drop grip at target row
          if (dropGrip) {
            const targetRow = rows[toIndex];
            if (targetRow) {
              const rowRect = targetRow.getBoundingClientRect();
              dropGrip.style.left = `${tableRect.left - 14}px`;
              dropGrip.style.top = `${rowRect.top}px`;
              dropGrip.style.height = `${rowRect.height}px`;
            }
          }
        } else {
          const cells = table.querySelectorAll('tr:first-child th, tr:first-child td');
          let bestIndex = fromIndex;
          let bestDist = Infinity;
          for (let i = 0; i <= cells.length; i++) {
            const boundaryX = i < cells.length
              ? (cells[i] as HTMLElement).getBoundingClientRect().left
              : (cells[cells.length - 1] as HTMLElement).getBoundingClientRect().right;
            const dist = Math.abs(ev.clientX - boundaryX);
            if (dist < bestDist) {
              bestDist = dist;
              bestIndex = i;
            }
          }
          toIndex = bestIndex > fromIndex ? bestIndex - 1 : bestIndex;
          toIndex = Math.max(0, Math.min(toIndex, cells.length - 1));

          const indicatorX = bestIndex < cells.length
            ? (cells[bestIndex] as HTMLElement).getBoundingClientRect().left
            : (cells[cells.length - 1] as HTMLElement).getBoundingClientRect().right;
          indicator!.style.left = `${indicatorX - 1}px`;
          indicator!.style.top = `${tableRect.top}px`;
          indicator!.style.height = `${tableRect.height}px`;

          // Position drop grip at target column
          if (dropGrip) {
            const targetCell = cells[toIndex] as HTMLElement | undefined;
            if (targetCell) {
              const cellRect = targetCell.getBoundingClientRect();
              dropGrip.style.left = `${cellRect.left}px`;
              dropGrip.style.top = `${tableRect.top - 14}px`;
              dropGrip.style.width = `${cellRect.width}px`;
            }
          }
        }
      };

      const onUp = (ev: PointerEvent) => {
        grip.releasePointerCapture(ev.pointerId);
        grip.classList.remove('dragging');
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);

        if (didDrag) {
          isDragging = false;
          indicator?.remove();
          dropGrip?.remove();

          if (toIndex !== fromIndex) {
            const table = currentTable!;
            const firstCell = table.querySelector('td, th');
            if (firstCell) {
              const rect = (firstCell as HTMLElement).getBoundingClientRect();
              const coords = editor.view.posAtCoords({
                left: rect.left + 1,
                top: rect.top + 1,
              });
              if (coords) {
                editor.chain()
                  .focus()
                  .setTextSelection(coords.pos)
                  .command(({ state, dispatch }) => {
                    if (type === 'row') {
                      return moveTableRow({
                        from: fromIndex,
                        to: toIndex,
                        pos: coords.pos,
                      })(state, dispatch);
                    } else {
                      return moveTableColumn({
                        from: fromIndex,
                        to: toIndex,
                        pos: coords.pos,
                      })(state, dispatch);
                    }
                  })
                  .run();

                // Update active index to the new position and show highlight
                if (type === 'row') {
                  activeRowIndex = toIndex;
                } else {
                  activeColIndex = toIndex;
                }
                // Wait for PM to re-render, then reposition grip & show highlight
                requestAnimationFrame(() => {
                  if (!currentTable) return;
                  positionGrips(currentTable);
                  showHighlight(type);
                  registerHighlightDismiss();
                  clearCellSelection();
                });
              }
            }
          } else {
            // No actual move — remove the active state
            grip.classList.remove('active');
          }
        } else {
          // Click — open context menu at click position
          openContextMenu(type, startX, startY);
        }
      };

      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
    };

    const createControls = (table: HTMLElement) => {
      if (currentTable === table) {
        positionBars(table);
        return;
      }

      hideControls();
      currentTable = table;

      // --- Add-column bar ---
      columnBar = createBar('table-add-column-bar', 'Add column');
      columnBar.addEventListener('mouseenter', clearHideTimeout);
      columnBar.addEventListener('mouseleave', scheduleHide);
      columnBar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentTable) return;

        const firstRow = currentTable.querySelector('tr');
        const lastCell = firstRow?.querySelector('td:last-child, th:last-child');
        if (lastCell) {
          const cellRect = lastCell.getBoundingClientRect();
          const pos = editor.view.posAtCoords({
            left: cellRect.left + cellRect.width / 2,
            top: cellRect.top + cellRect.height / 2,
          });
          if (pos) {
            editor.chain().focus().setTextSelection(pos.pos).addColumnAfter().run();
            setTimeout(() => {
              const newLastCell = currentTable
                ?.querySelector('tr')
                ?.querySelector('td:last-child, th:last-child');
              if (newLastCell) {
                const newRect = newLastCell.getBoundingClientRect();
                const newPos = editor.view.posAtCoords({
                  left: newRect.left + newRect.width / 2,
                  top: newRect.top + newRect.height / 2,
                });
                if (newPos) {
                  editor.chain().setTextSelection(newPos.pos).run();
                }
              }
            }, 10);
          }
        }
      });

      // --- Add-row bar ---
      rowBar = createBar('table-add-row-bar', 'Add row');
      rowBar.addEventListener('mouseenter', clearHideTimeout);
      rowBar.addEventListener('mouseleave', scheduleHide);
      rowBar.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentTable) return;

        const rows = currentTable.querySelectorAll('tr');
        const lastRow = rows[rows.length - 1];
        const firstCell = lastRow?.querySelector('td, th');
        if (firstCell) {
          const cellRect = firstCell.getBoundingClientRect();
          const pos = editor.view.posAtCoords({
            left: cellRect.left + cellRect.width / 2,
            top: cellRect.top + cellRect.height / 2,
          });
          if (pos) {
            editor.chain().focus().setTextSelection(pos.pos).addRowAfter().run();
            setTimeout(() => {
              const newRows = currentTable?.querySelectorAll('tr');
              const newLastRow = newRows?.[newRows.length - 1];
              const newFirstCell = newLastRow?.querySelector('td, th');
              if (newFirstCell) {
                const newRect = newFirstCell.getBoundingClientRect();
                const newPos = editor.view.posAtCoords({
                  left: newRect.left + newRect.width / 2,
                  top: newRect.top + newRect.height / 2,
                });
                if (newPos) {
                  editor.chain().setTextSelection(newPos.pos).run();
                }
              }
            }, 10);
          }
        }
      });

      document.body.appendChild(columnBar);
      document.body.appendChild(rowBar);
      positionBars(table);
    };

    const hideControls = () => {
      if (isDragging) return;
      clearHideTimeout();
      closeContextMenu();
      columnBar?.remove();
      rowBar?.remove();
      columnBar = null;
      rowBar = null;
      hideGrips();
      currentTable = null;
    };

    return [
      new Plugin({
        key: new PluginKey('tableControls'),
        view() {
          const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) return;

            // While context menu is open, freeze all controls in place
            if (contextMenu) return;

            const target = e.target as HTMLElement;
            const isOverControl = target.closest(
              '.table-add-column-bar, .table-add-row-bar, .table-row-grip, .table-col-grip'
            );

            if (isOverControl) {
              clearHideTimeout();
              return;
            }

            const cell = target.closest('td, th') as HTMLElement | null;
            const table = target.closest('table');

            if (table && editor.view.dom.contains(table)) {
              clearHideTimeout();
              createControls(table as HTMLElement);
              if (cell) {
                updateGripsForCell(cell);
              }
            } else if (currentTable) {
              scheduleHide();
            }
          };

          const handleScroll = () => {
            if (currentTable) {
              positionBars(currentTable);
              positionGrips(currentTable);
              // Close menu on scroll but keep highlight tracking the table
              if (contextMenu) {
                closeContextMenu(true);
              }
              // Reposition selection highlight on scroll
              if (selectionHighlight && menuGripType) {
                showHighlight(menuGripType);
              }
            }
          };

          document.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('scroll', handleScroll, true);

          return {
            update() {
              if (currentTable) {
                positionBars(currentTable);
                positionGrips(currentTable);
              }
            },
            destroy() {
              document.removeEventListener('mousemove', handleMouseMove);
              window.removeEventListener('scroll', handleScroll, true);
              hideControls();
            },
          };
        },
      }),
    ];
  },
});
