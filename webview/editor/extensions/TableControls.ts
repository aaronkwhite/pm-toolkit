/**
 * Table Controls Extension
 *
 * Adds full-width/full-height pill bars to add columns and rows to tables.
 * - Hover over table: shows add-row bar below and add-column bar to the right
 * - Both bars visible simultaneously on table hover
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TableControls = Extension.create({
  name: 'tableControls',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let currentTable: HTMLElement | null = null;
    let columnBar: HTMLElement | null = null;
    let rowBar: HTMLElement | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;

    const PLUS_SVG = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

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

    const positionElements = (table: HTMLElement) => {
      if (!columnBar || !rowBar) return;

      const tableRect = table.getBoundingClientRect();

      // Row bar: full width below the table
      rowBar.style.left = `${tableRect.left}px`;
      rowBar.style.top = `${tableRect.bottom + 4}px`;
      rowBar.style.width = `${tableRect.width}px`;

      // Column bar: full height to the right of the table
      columnBar.style.left = `${tableRect.right + 4}px`;
      columnBar.style.top = `${tableRect.top}px`;
      columnBar.style.height = `${tableRect.height}px`;
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
      clearHideTimeout();
      hideTimeout = setTimeout(hideControls, 150);
    };

    const createControls = (table: HTMLElement) => {
      if (currentTable === table) {
        positionElements(table);
        showBars();
        return;
      }

      hideControls();
      currentTable = table;

      // Create column bar
      columnBar = createBar('table-add-column-bar', 'Add column');
      columnBar.addEventListener('mouseenter', () => {
        clearHideTimeout();
      });
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
            top: cellRect.top + cellRect.height / 2
          });
          if (pos) {
            editor.chain()
              .focus()
              .setTextSelection(pos.pos)
              .addColumnAfter()
              .run();

            setTimeout(() => {
              const newLastCell = currentTable?.querySelector('tr')?.querySelector('td:last-child, th:last-child');
              if (newLastCell) {
                const newRect = newLastCell.getBoundingClientRect();
                const newPos = editor.view.posAtCoords({
                  left: newRect.left + newRect.width / 2,
                  top: newRect.top + newRect.height / 2
                });
                if (newPos) {
                  editor.chain().setTextSelection(newPos.pos).run();
                }
              }
            }, 10);
          }
        }
      });

      // Create row bar
      rowBar = createBar('table-add-row-bar', 'Add row');
      rowBar.addEventListener('mouseenter', () => {
        clearHideTimeout();
      });
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
            top: cellRect.top + cellRect.height / 2
          });
          if (pos) {
            editor.chain()
              .focus()
              .setTextSelection(pos.pos)
              .addRowAfter()
              .run();

            setTimeout(() => {
              const newRows = currentTable?.querySelectorAll('tr');
              const newLastRow = newRows?.[newRows.length - 1];
              const newFirstCell = newLastRow?.querySelector('td, th');
              if (newFirstCell) {
                const newRect = newFirstCell.getBoundingClientRect();
                const newPos = editor.view.posAtCoords({
                  left: newRect.left + newRect.width / 2,
                  top: newRect.top + newRect.height / 2
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
      positionElements(table);
      showBars();
    };

    const hideControls = () => {
      clearHideTimeout();
      columnBar?.remove();
      rowBar?.remove();
      columnBar = null;
      rowBar = null;
      currentTable = null;
    };

    return [
      new Plugin({
        key: new PluginKey('tableControls'),
        view() {
          const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const table = target.closest('table');
            const isOverBar = target.closest('.table-add-column-bar, .table-add-row-bar');

            if (isOverBar) {
              clearHideTimeout();
              return;
            }

            if (table && editor.view.dom.contains(table)) {
              clearHideTimeout();
              createControls(table as HTMLElement);
            } else if (currentTable) {
              scheduleHide();
            }
          };

          const handleScroll = () => {
            if (currentTable) {
              positionElements(currentTable);
            }
          };

          document.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('scroll', handleScroll, true);

          return {
            update() {
              if (currentTable) {
                positionElements(currentTable);
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
