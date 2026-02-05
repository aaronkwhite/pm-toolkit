/**
 * Table Controls Extension
 *
 * Adds plus buttons to add columns and rows to tables.
 * - Hover over right edge of table: shows column add button
 * - Hover over bottom edge of table: shows row add button
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const TableControls = Extension.create({
  name: 'tableControls',

  addProseMirrorPlugins() {
    const editor = this.editor;
    let currentTable: HTMLElement | null = null;
    let columnBtn: HTMLElement | null = null;
    let rowBtn: HTMLElement | null = null;

    const createButton = (className: string, title: string): HTMLElement => {
      const btn = document.createElement('button');
      btn.className = className;
      btn.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
      btn.title = title;
      btn.contentEditable = 'false';
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      return btn;
    };

    const positionElements = (table: HTMLElement) => {
      if (!columnBtn || !rowBtn) return;

      const tableRect = table.getBoundingClientRect();

      // Column button - right side, vertically centered
      columnBtn.style.left = `${tableRect.right + 4}px`;
      columnBtn.style.top = `${tableRect.top + tableRect.height / 2 - 8}px`;

      // Row button - bottom, horizontally centered
      rowBtn.style.left = `${tableRect.left + tableRect.width / 2 - 8}px`;
      rowBtn.style.top = `${tableRect.bottom + 4}px`;
    };

    const showColumnBtn = () => {
      columnBtn?.classList.add('visible');
      rowBtn?.classList.remove('visible');
    };

    const showRowBtn = () => {
      rowBtn?.classList.add('visible');
      columnBtn?.classList.remove('visible');
    };

    const hideAllBtns = () => {
      columnBtn?.classList.remove('visible');
      rowBtn?.classList.remove('visible');
    };

    const createControls = (table: HTMLElement) => {
      if (currentTable === table) {
        positionElements(table);
        return;
      }

      hideControls();
      currentTable = table;

      // Create column button
      columnBtn = createButton('table-add-column-btn', 'Add column');
      columnBtn.addEventListener('click', (e) => {
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

      // Create row button
      rowBtn = createButton('table-add-row-btn', 'Add row');
      rowBtn.addEventListener('click', (e) => {
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

      document.body.appendChild(columnBtn);
      document.body.appendChild(rowBtn);
      positionElements(table);
    };

    const hideControls = () => {
      columnBtn?.remove();
      rowBtn?.remove();
      columnBtn = null;
      rowBtn = null;
      currentTable = null;
    };

    return [
      new Plugin({
        key: new PluginKey('tableControls'),
        view() {
          let hideTimeout: ReturnType<typeof setTimeout> | null = null;
          const EDGE_THRESHOLD = 30; // pixels from edge to trigger button

          const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const table = target.closest('table');
            const isOverButton = target.closest('.table-add-column-btn, .table-add-row-btn');

            if (hideTimeout) {
              clearTimeout(hideTimeout);
              hideTimeout = null;
            }

            if (isOverButton) {
              // Keep current button visible
              return;
            }

            if (table && editor.view.dom.contains(table)) {
              createControls(table as HTMLElement);

              // Determine which edge we're near
              const tableRect = table.getBoundingClientRect();
              const distFromRight = tableRect.right - e.clientX;
              const distFromBottom = tableRect.bottom - e.clientY;

              // Show button based on which edge is closest (within threshold)
              if (distFromRight >= 0 && distFromRight <= EDGE_THRESHOLD && distFromBottom > EDGE_THRESHOLD) {
                showColumnBtn();
              } else if (distFromBottom >= 0 && distFromBottom <= EDGE_THRESHOLD && distFromRight > EDGE_THRESHOLD) {
                showRowBtn();
              } else if (distFromRight >= 0 && distFromRight <= EDGE_THRESHOLD && distFromBottom >= 0 && distFromBottom <= EDGE_THRESHOLD) {
                // Corner - show whichever is closer
                if (distFromRight < distFromBottom) {
                  showColumnBtn();
                } else {
                  showRowBtn();
                }
              } else {
                hideAllBtns();
              }
            } else if (currentTable) {
              hideTimeout = setTimeout(hideControls, 150);
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
