/**
 * Table Controls Extension
 *
 * Adds full-width/full-height pill bars to add columns and rows to tables,
 * plus row/column grip handles for drag-to-reorder.
 * - Hover over a table cell: shows one row grip (left) and one column grip (top)
 *   for the hovered row/column, plus add-row/add-column bars
 * - Drag a gripper to reorder rows/columns via prosemirror-tables commands
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { moveTableRow, moveTableColumn } from 'prosemirror-tables';

const PLUS_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

const GRIP_SVG = `<svg width="6" height="10" viewBox="0 0 6 10" fill="currentColor"><circle cx="1.5" cy="1.5" r="1"/><circle cx="4.5" cy="1.5" r="1"/><circle cx="1.5" cy="5" r="1"/><circle cx="4.5" cy="5" r="1"/><circle cx="1.5" cy="8.5" r="1"/><circle cx="4.5" cy="8.5" r="1"/></svg>`;

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

    const createBar = (className: string, title: string): HTMLElement => {
      const bar = document.createElement('button');
      bar.className = className;
      bar.innerHTML = PLUS_SVG;
      bar.title = title;
      bar.contentEditable = 'false';
      bar.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      return bar;
    };

    const createGripEl = (className: string): HTMLElement => {
      const grip = document.createElement('button');
      grip.className = className;
      grip.innerHTML = GRIP_SVG;
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

      if (rowGrip && activeRowIndex > 0) {
        const rows = table.querySelectorAll('tr');
        const row = rows[activeRowIndex];
        if (row) {
          const rect = row.getBoundingClientRect();
          rowGrip.style.left = `${tableRect.left - 18}px`;
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
          colGrip.style.top = `${tableRect.top - 18}px`;
          colGrip.style.width = `${rect.width}px`;
        }
      }
    };

    const showBars = () => {
      columnBar?.classList.add('visible');
      rowBar?.classList.add('visible');
    };

    const clearHideTimeout = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
    };

    const scheduleHide = () => {
      if (isDragging) return;
      clearHideTimeout();
      hideTimeout = setTimeout(hideControls, 150);
    };

    // --- Grip visibility based on hovered cell ---

    const updateGripsForCell = (cell: HTMLElement) => {
      if (!currentTable) return;

      const row = cell.closest('tr');
      if (!row) return;
      const rows = currentTable.querySelectorAll('tr');
      let rowIdx = -1;
      rows.forEach((r, i) => { if (r === row) rowIdx = i; });

      // Column index: count preceding siblings
      const cellsInRow = row.querySelectorAll('td, th');
      let colIdx = -1;
      cellsInRow.forEach((c, i) => { if (c === cell) colIdx = i; });

      const tableRect = currentTable.getBoundingClientRect();

      // Row grip: only for body rows (index > 0)
      if (rowIdx > 0 && rowIdx !== activeRowIndex) {
        activeRowIndex = rowIdx;
        if (!rowGrip) {
          rowGrip = createGripEl('table-row-grip');
          rowGrip.addEventListener('mouseenter', clearHideTimeout);
          rowGrip.addEventListener('mouseleave', scheduleHide);
          rowGrip.addEventListener('pointerdown', (e) => startDrag(e, 'row'));
          document.body.appendChild(rowGrip);
        }
        const rect = row.getBoundingClientRect();
        rowGrip.style.left = `${tableRect.left - 18}px`;
        rowGrip.style.top = `${rect.top}px`;
        rowGrip.style.height = `${rect.height}px`;
        rowGrip.classList.add('visible');
      } else if (rowIdx === 0) {
        // Header row — hide row grip
        activeRowIndex = -1;
        rowGrip?.classList.remove('visible');
      }

      // Column grip
      if (colIdx >= 0 && colIdx !== activeColIndex) {
        activeColIndex = colIdx;
        if (!colGrip) {
          colGrip = createGripEl('table-col-grip');
          colGrip.addEventListener('mouseenter', clearHideTimeout);
          colGrip.addEventListener('mouseleave', scheduleHide);
          colGrip.addEventListener('pointerdown', (e) => startDrag(e, 'column'));
          document.body.appendChild(colGrip);
        }
        // Use the header cell for width/position (column spans full table height)
        const headerCells = currentTable.querySelectorAll('tr:first-child th, tr:first-child td');
        const headerCell = headerCells[colIdx] as HTMLElement | undefined;
        if (headerCell) {
          const rect = headerCell.getBoundingClientRect();
          colGrip.style.left = `${rect.left}px`;
          colGrip.style.top = `${tableRect.top - 18}px`;
          colGrip.style.width = `${rect.width}px`;
        }
        colGrip.classList.add('visible');
      }
    };

    const hideGrips = () => {
      rowGrip?.remove();
      colGrip?.remove();
      rowGrip = null;
      colGrip = null;
      activeRowIndex = -1;
      activeColIndex = -1;
    };

    // --- Drag handling ---

    const startDrag = (e: PointerEvent, type: 'row' | 'column') => {
      e.preventDefault();
      const fromIndex = type === 'row' ? activeRowIndex : activeColIndex;
      if (fromIndex < 0) return;

      const grip = e.currentTarget as HTMLElement;
      grip.setPointerCapture(e.pointerId);
      grip.classList.add('dragging');
      isDragging = true;

      const indicator = document.createElement('div');
      indicator.className = `table-drop-indicator ${type}`;
      document.body.appendChild(indicator);

      let toIndex = fromIndex;
      const table = currentTable!;
      const tableRect = table.getBoundingClientRect();

      const onMove = (ev: PointerEvent) => {
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
          indicator.style.left = `${tableRect.left}px`;
          indicator.style.top = `${indicatorY - 1}px`;
          indicator.style.width = `${tableRect.width}px`;
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
          indicator.style.left = `${indicatorX - 1}px`;
          indicator.style.top = `${tableRect.top}px`;
          indicator.style.height = `${tableRect.height}px`;
        }
      };

      const onUp = (ev: PointerEvent) => {
        grip.releasePointerCapture(ev.pointerId);
        grip.classList.remove('dragging');
        isDragging = false;
        indicator.remove();
        grip.removeEventListener('pointermove', onMove);
        grip.removeEventListener('pointerup', onUp);

        if (toIndex !== fromIndex) {
          // The move commands use selection.$from to locate the table,
          // so we must place the selection inside the table first.
          const firstCell = table.querySelector('td, th');
          if (firstCell) {
            const rect = (firstCell as HTMLElement).getBoundingClientRect();
            const coords = editor.view.posAtCoords({
              left: rect.left + 1,
              top: rect.top + 1,
            });
            if (coords) {
              // Set selection inside the table, then run the move command
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
            }
          }
        }
      };

      grip.addEventListener('pointermove', onMove);
      grip.addEventListener('pointerup', onUp);
    };

    const createControls = (table: HTMLElement) => {
      if (currentTable === table) {
        positionBars(table);
        showBars();
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
      showBars();
    };

    const hideControls = () => {
      if (isDragging) return;
      clearHideTimeout();
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
