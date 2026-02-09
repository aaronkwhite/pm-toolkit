/**
 * Custom Table Extension
 *
 * Extends @tiptap/extension-table to persist column widths in markdown.
 *
 * ProseMirror stores per-cell `colwidth` attributes when columns are resized,
 * but tiptap-markdown's GFM serializer has no syntax for pixel widths and
 * silently drops them. This extension writes an HTML comment before the table:
 *
 *   <!-- colwidths: 100,200,150 -->
 *   | A | B | C |
 *   | --- | --- | --- |
 *
 * On parse, the `updateDOM` hook reads the comment, applies `colwidth`
 * attributes to every row's cells, then removes the comment node.
 *
 * Tables that fall back to raw HTML serialization (colspan/rowspan) preserve
 * colwidths natively in the HTML output, so the comment is only emitted for
 * GFM-compatible tables.
 */

import Table from '@tiptap/extension-table';
import { Fragment } from '@tiptap/pm/model';
import { getHTMLFromFragment } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Helpers (mirrored from tiptap-markdown internals)
// ---------------------------------------------------------------------------

function childNodes(node: any): any[] {
  return node?.content?.content ?? [];
}

function hasSpan(node: any): boolean {
  return node.attrs.colspan > 1 || node.attrs.rowspan > 1;
}

/** True when the table can be serialized as plain GFM markdown. */
function isMarkdownSerializable(node: any): boolean {
  const rows = childNodes(node);
  const firstRow = rows[0];
  const bodyRows = rows.slice(1);

  if (
    childNodes(firstRow).some(
      (cell: any) =>
        cell.type.name !== 'tableHeader' || hasSpan(cell) || cell.childCount > 1,
    )
  ) {
    return false;
  }

  if (
    bodyRows.some((row: any) =>
      childNodes(row).some(
        (cell: any) =>
          cell.type.name === 'tableHeader' || hasSpan(cell) || cell.childCount > 1,
      ),
    )
  ) {
    return false;
  }

  return true;
}

/** Serialize a ProseMirror node to raw HTML (used for non-GFM fallback). */
function serializeNodeHTML(node: any, parent: any): string {
  const schema = node.type.schema;
  const html = getHTMLFromFragment(Fragment.from(node), schema);

  if (
    node.isBlock &&
    (parent instanceof Fragment || parent.type.name === schema.topNodeType.name)
  ) {
    // Format block HTML per commonmark spec
    const template = document.createElement('template');
    template.innerHTML = html;
    const element = template.content.firstElementChild;
    if (element) {
      element.innerHTML = element.innerHTML.trim()
        ? `\n${element.innerHTML}\n`
        : '\n';
      return element.outerHTML;
    }
  }
  return html;
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export const CustomTable = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any, parent: any) {
          // Fall back to raw HTML for complex tables (colspan/rowspan, multi-paragraph cells)
          if (!isMarkdownSerializable(node)) {
            if ((this as any).editor?.storage?.markdown?.options?.html) {
              state.write(serializeNodeHTML(node, parent));
            } else {
              state.write(`[${node.type.name}]`);
            }
            if (node.isBlock) {
              state.closeBlock(node);
            }
            return;
          }

          // --- Collect colwidths from the first row ---
          const firstRow = node.child(0);
          const widths: (number | null)[] = [];
          firstRow.forEach((cell: any) => {
            const cw = cell.attrs.colwidth;
            widths.push(cw ? cw[0] : null);
          });

          const hasWidths = widths.some((w) => w !== null);
          if (hasWidths) {
            const widthStr = widths.map((w) => (w ?? 0)).join(',');
            state.write(`<!-- colwidths: ${widthStr} -->`);
            state.ensureNewLine();
          }

          // --- Standard GFM table output ---
          state.inTable = true;
          node.forEach((row: any, _p: number, i: number) => {
            state.write('| ');
            row.forEach((col: any, _p2: number, j: number) => {
              if (j) {
                state.write(' | ');
              }
              const cellContent = col.firstChild;
              if (cellContent.textContent.trim()) {
                state.renderInline(cellContent);
              }
            });
            state.write(' |');
            state.ensureNewLine();
            if (!i) {
              const delimiterRow = Array.from({ length: row.childCount })
                .map(() => '---')
                .join(' | ');
              state.write(`| ${delimiterRow} |`);
              state.ensureNewLine();
            }
          });
          state.closeBlock(node);
          state.inTable = false;
        },
        parse: {
          updateDOM(element: HTMLElement) {
            const walker = document.createTreeWalker(
              element,
              NodeFilter.SHOW_COMMENT,
            );
            const toRemove: Comment[] = [];
            let comment: Comment | null;
            while ((comment = walker.nextNode() as Comment | null)) {
              const match = comment.textContent
                ?.trim()
                .match(/^colwidths:\s*([\d,]+)$/);
              if (!match) continue;

              const widths = match[1].split(',').map(Number);

              // Find the next sibling element (skip whitespace text nodes)
              let sibling: ChildNode | null = comment.nextSibling;
              while (sibling && sibling.nodeType === Node.TEXT_NODE) {
                sibling = sibling.nextSibling;
              }

              if (sibling instanceof HTMLTableElement) {
                sibling.querySelectorAll('tr').forEach((row) => {
                  row.querySelectorAll('td, th').forEach((cell, i) => {
                    if (widths[i]) {
                      cell.setAttribute('colwidth', String(widths[i]));
                    }
                  });
                });
              }

              toRemove.push(comment);
            }
            toRemove.forEach((c) => c.remove());
          },
        },
      },
    };
  },
});
