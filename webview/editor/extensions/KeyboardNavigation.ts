/**
 * Keyboard Navigation Extension
 *
 * Adds Home/End key support for cursor navigation in ProseMirror.
 * By default, ProseMirror doesn't handle Home/End keys - this extension adds that functionality.
 * Also handles delete when selection spans block elements like tables.
 * Adds Tab/Shift+Tab navigation within tables.
 */

import { Extension, findParentNodeClosestToPos } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, NodeSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

/**
 * Check if selection is a CellSelection and handle column/row deletion.
 * Also handles selection spanning across a table.
 */
function deleteSelectionWithTable(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;

  // Handle CellSelection (column/row selection within a table)
  if (selection instanceof CellSelection) {
    // Check if ALL cells are selected → delete the whole table
    const table = findParentNodeClosestToPos(
      selection.ranges[0].$from,
      (node) => node.type.name === 'table'
    );
    if (table) {
      let cellCount = 0;
      table.node.descendants((node) => {
        if (node.type.name === 'table') return false;
        if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
          cellCount++;
        }
      });
      if (cellCount === selection.ranges.length) {
        editor.commands.deleteTable();
        return true;
      }
    }

    // Check if entire column(s) selected
    if (selection.isColSelection()) {
      editor.commands.deleteColumn();
      return true;
    }
    // Check if entire row(s) selected
    if (selection.isRowSelection()) {
      editor.commands.deleteRow();
      return true;
    }
    // Multiple cells selected but not full row/column - delete contents
    editor.commands.deleteSelection();
    return true;
  }

  const { $from, $to } = selection;

  // Only handle non-empty selections
  if (selection.empty) {
    return false;
  }

  // Check if selection spans across a table
  let hasTable = false;
  state.doc.nodesBetween($from.pos, $to.pos, (node: any) => {
    if (node.type.name === 'table') {
      hasTable = true;
      return false; // Stop traversing
    }
  });

  if (hasTable) {
    // Delete the entire selection range
    editor.chain().deleteSelection().run();
    return true;
  }

  return false;
}

/**
 * Find the start position of the current line (text block)
 */
function findLineStart(
  doc: any,
  pos: number
): number {
  const $pos = doc.resolve(pos);
  // Get the start of the current text block
  return $pos.start($pos.depth);
}

/**
 * Find the end position of the current line (text block)
 */
function findLineEnd(
  doc: any,
  pos: number
): number {
  const $pos = doc.resolve(pos);
  // Get the end of the current text block
  return $pos.end($pos.depth);
}

/**
 * Check if cursor is inside a table
 */
function isInTable(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Walk up the node tree to find a table
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      return true;
    }
  }
  return false;
}

/**
 * Check if cursor is inside a code block
 */
function isInCodeBlock(editor: any): { inCodeBlock: boolean; depth: number } {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Handle NodeSelection where the whole code block is selected
  // (e.g. after clicking on it). In this case $from.depth === 0 and
  // selection.node is the selected block-level node.
  // We use duck-typing ("node" property) rather than instanceof to avoid
  // issues with minified/mangled class names in the bundle.
  const isNodeSel = (selection as any).node !== undefined;
  if (isNodeSel && (selection as any).node.type.name === 'codeBlock') {
    return { inCodeBlock: true, depth: 1 };
  }

  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'codeBlock') {
      return { inCodeBlock: true, depth };
    }
  }
  return { inCodeBlock: false, depth: -1 };
}

/**
 * Check if cursor is at the very start of a code block
 */
function isAtCodeBlockStart(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  const { inCodeBlock, depth } = isInCodeBlock(editor);
  if (!inCodeBlock) return false;

  // Get the start position of the code block content
  const codeBlockStart = $from.start(depth);
  return $from.pos === codeBlockStart;
}

/**
 * Check if cursor is at the very end of a code block (or on the last line)
 */
function isAtCodeBlockEnd(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  const { inCodeBlock, depth } = isInCodeBlock(editor);
  if (!inCodeBlock) return false;

  // Get the end position of the code block content
  const codeBlockEnd = $from.end(depth);

  // Check if at exact end, or if there's no newline after cursor position
  // (i.e., cursor is on the last line)
  const codeBlock = $from.node(depth);
  const textContent = codeBlock.textContent;
  const posInBlock = $from.pos - $from.start(depth);
  const textAfterCursor = textContent.slice(posInBlock);

  // At end if no text after cursor, or only whitespace with no newlines
  return $from.pos === codeBlockEnd || !textAfterCursor.includes('\n');
}

/**
 * Exit code block and move cursor above it
 */
function exitCodeBlockAbove(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  const { inCodeBlock, depth } = isInCodeBlock(editor);
  if (!inCodeBlock) return false;

  // Get position before the code block
  const codeBlockBefore = $from.before(depth);

  // Check if there's a node before the code block
  if (codeBlockBefore <= 0) {
    // At the start of document, insert paragraph before
    editor.chain()
      .insertContentAt(codeBlockBefore, { type: 'paragraph' })
      .setTextSelection(codeBlockBefore + 1)
      .run();
  } else {
    // Check what node is before the code block
    const nodeBefore = state.doc.nodeAt(codeBlockBefore - 1);
    if (nodeBefore) {
      // Move cursor to the end of the node before code block
      // codeBlockBefore - 1 places us at the end of the previous node's content
      editor.commands.setTextSelection(codeBlockBefore - 1);
    } else {
      // Insert a paragraph before the code block
      editor.chain()
        .insertContentAt(codeBlockBefore, { type: 'paragraph' })
        .setTextSelection(codeBlockBefore + 1)
        .run();
    }
  }

  return true;
}

/**
 * Exit code block and move cursor below it
 * Always inserts a new paragraph right after the code block
 */
function exitCodeBlockBelow(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  const { inCodeBlock, depth } = isInCodeBlock(editor);
  if (!inCodeBlock) return false;

  // Compute the position immediately after the code block node.
  // When selection is a NodeSelection targeting the code block, $from.depth === 0
  // (pointing at doc level), so $from.after(depth) would be unreliable.
  // Instead, use selection.from + node.nodeSize for NodeSelection,
  // or $from.after(depth) for a normal cursor inside the block.
  let codeBlockAfter: number;
  const isNodeSel = (selection as any).node !== undefined;
  if (isNodeSel && (selection as any).node.type.name === 'codeBlock') {
    codeBlockAfter = selection.from + (selection as any).node.nodeSize;
  } else {
    codeBlockAfter = $from.after(depth);
  }

  // Use a direct ProseMirror transaction to insert the paragraph.
  // Tiptap's chain insertContentAt routes through tiptap-markdown's override
  // which can cause surrounding nodes (e.g. a horizontalRule immediately after
  // the code block) to be dropped when inserting at certain boundary positions.
  // Using tr.insert() directly avoids that issue entirely.
  const { view } = editor;
  const { schema } = state;
  const paragraph = schema.nodes.paragraph.create();
  const tr = state.tr.insert(codeBlockAfter, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, codeBlockAfter + 1));
  view.dispatch(tr);

  return true;
}

/**
 * Check if cursor is in the last cell of a table
 */
function isInLastTableCell(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Find the table
  let tableDepth = -1;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth === -1) return false;

  const table = $from.node(tableDepth);
  const tableStart = $from.start(tableDepth);

  // Get all cells in the table
  let lastCellStart = -1;
  table.descendants((node, pos) => {
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      lastCellStart = tableStart + pos;
    }
  });

  // Check if cursor is in the last cell
  const cellDepth = $from.depth;
  for (let depth = cellDepth; depth > tableDepth; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      const cellStart = $from.start(depth);
      return cellStart === lastCellStart;
    }
  }

  return false;
}

/**
 * Exit table and move cursor to paragraph after it
 */
function exitTableToNextParagraph(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Find the table
  let tableDepth = -1;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth === -1) return false;

  // Get position after the table
  const tableEnd = $from.after(tableDepth);

  // Check if there's a node after the table
  const nodeAfter = state.doc.nodeAt(tableEnd);

  if (!nodeAfter || nodeAfter.type.name !== 'paragraph') {
    // Insert a paragraph after the table and move cursor there
    editor.chain()
      .insertContentAt(tableEnd, { type: 'paragraph' })
      .setTextSelection(tableEnd + 1)
      .run();
  } else {
    // Move cursor to the existing paragraph
    editor.commands.setTextSelection(tableEnd + 1);
  }

  return true;
}

/**
 * Exit table and always insert a new paragraph below it
 */
function exitTableInsertBelow(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // Find the table
  let tableDepth = -1;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      tableDepth = depth;
      break;
    }
  }

  if (tableDepth === -1) return false;

  // Get position after the table
  const tableEnd = $from.after(tableDepth);

  // Always insert a paragraph right after the table
  editor.chain()
    .insertContentAt(tableEnd, { type: 'paragraph' })
    .setTextSelection(tableEnd + 1)
    .run();

  return true;
}

/**
 * Check if the cursor is positioned immediately after a code block.
 * This handles the case where a NodeSelection lands on a node right after a code block
 * (e.g. clicking near the boundary between a code block and an HR).
 */
function isCursorAfterCodeBlock(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { from } = selection;

  // Only apply when at or near the document top level (depth 0-1)
  const $from = state.doc.resolve(from);
  if ($from.depth > 1) return false;

  // The node immediately before `from` position
  const nodeBefore = state.doc.nodeAt(from - 1);
  if (!nodeBefore) {
    // Try the node at from - nodeSize if this is a block boundary
    const $pos = state.doc.resolve(from);
    const nb = $pos.nodeBefore;
    return nb?.type.name === 'codeBlock';
  }
  return nodeBefore.type.name === 'codeBlock';
}

/**
 * Insert a paragraph at the current selection position (before the selected node)
 * and move cursor into it. Used when cursor is positioned after a code block.
 */
function insertParagraphBeforeSelection(editor: any): boolean {
  const { state } = editor;
  const { selection } = state;
  const { from } = selection;

  const { view } = editor;
  const { schema } = state;
  const paragraph = schema.nodes.paragraph.create();
  const tr = state.tr.insert(from, paragraph);
  tr.setSelection(TextSelection.create(tr.doc, from + 1));
  view.dispatch(tr);

  return true;
}

export const KeyboardNavigation = Extension.create({
  name: 'keyboardNavigation',

  addKeyboardShortcuts() {
    return {
      // Home key - move to start of current line/block
      Home: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;

        const lineStart = findLineStart(state.doc, $from.pos);

        // Create a new selection at the line start
        const newSelection = TextSelection.create(state.doc, lineStart);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // End key - move to end of current line/block
      End: ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from } = selection;

        const lineEnd = findLineEnd(state.doc, $from.pos);

        // Create a new selection at the line end
        const newSelection = TextSelection.create(state.doc, lineEnd);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // Shift+Home - select from cursor to start of line
      'Shift-Home': ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, $to, $anchor } = selection;

        const lineStart = findLineStart(state.doc, $from.pos);

        // Create a selection from the anchor to the line start
        const newSelection = TextSelection.create(state.doc, $anchor.pos, lineStart);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // Shift+End - select from cursor to end of line
      'Shift-End': ({ editor }) => {
        const { state, view } = editor;
        const { selection } = state;
        const { $from, $to, $anchor } = selection;

        const lineEnd = findLineEnd(state.doc, $from.pos);

        // Create a selection from the anchor to the line end
        const newSelection = TextSelection.create(state.doc, $anchor.pos, lineEnd);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // Cmd/Ctrl+Home - move to start of document
      'Mod-Home': ({ editor }) => {
        const { state, view } = editor;

        // Position 1 is typically the start of content (after doc node)
        const docStart = 1;
        const newSelection = TextSelection.create(state.doc, docStart);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // Cmd/Ctrl+End - move to end of document
      'Mod-End': ({ editor }) => {
        const { state, view } = editor;

        // Get the end of the document content
        const docEnd = state.doc.content.size - 1;
        const newSelection = TextSelection.create(state.doc, docEnd);
        const tr = state.tr.setSelection(newSelection);
        view.dispatch(tr);

        return true;
      },

      // Delete/Backspace when selection spans a table
      Delete: ({ editor }) => {
        return deleteSelectionWithTable(editor);
      },

      Backspace: ({ editor }) => {
        return deleteSelectionWithTable(editor);
      },

      // Tab - move to next cell in table, or indent list item
      Tab: ({ editor }) => {
        if (isInTable(editor)) {
          // If in last cell, exit table instead of adding a new row
          if (isInLastTableCell(editor)) {
            return exitTableToNextParagraph(editor);
          }
          // Otherwise, move to next cell
          return editor.commands.goToNextCell();
        }
        // Try to indent list item (sinkListItem)
        if (editor.can().sinkListItem('listItem')) {
          return editor.commands.sinkListItem('listItem');
        }
        if (editor.can().sinkListItem('taskItem')) {
          return editor.commands.sinkListItem('taskItem');
        }
        // Return false to let Tiptap handle default behavior
        return false;
      },

      // Shift+Tab - move to previous cell in table, or outdent list item
      'Shift-Tab': ({ editor }) => {
        if (isInTable(editor)) {
          // Use Tiptap's built-in goToPreviousCell command
          return editor.commands.goToPreviousCell();
        }
        // Try to outdent list item (liftListItem)
        if (editor.can().liftListItem('listItem')) {
          return editor.commands.liftListItem('listItem');
        }
        if (editor.can().liftListItem('taskItem')) {
          return editor.commands.liftListItem('taskItem');
        }
        // Return false to let Tiptap handle default behavior
        return false;
      },

      // ArrowUp at start of code block - exit above
      ArrowUp: ({ editor }) => {
        if (isInCodeBlock(editor).inCodeBlock && isAtCodeBlockStart(editor)) {
          return exitCodeBlockAbove(editor);
        }
        return false;
      },

      // ArrowDown at end of code block - exit below
      ArrowDown: ({ editor }) => {
        if (isInCodeBlock(editor).inCodeBlock && isAtCodeBlockEnd(editor)) {
          return exitCodeBlockBelow(editor);
        }
        return false;
      },

      // Cmd/Ctrl+Enter - exit code block or table and insert paragraph below
      'Mod-Enter': ({ editor }) => {
        if (isInCodeBlock(editor).inCodeBlock) {
          return exitCodeBlockBelow(editor);
        }
        // Also handle the case where the cursor is just after a code block
        // (e.g. a NodeSelection on the node immediately following a code block).
        // This can happen when clicking near the boundary between a code block
        // and the next block node (like an HR).
        if (isCursorAfterCodeBlock(editor)) {
          return insertParagraphBeforeSelection(editor);
        }
        if (isInTable(editor)) {
          return exitTableInsertBelow(editor);
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        key: new PluginKey('gapClickHandler'),
        props: {
          handleClickOn(view, pos, node, nodePos, event) {
            // Detect clicks in the margin between two adjacent tables (or other
            // isolating blocks). When the click lands on a table but the mouse Y
            // is actually in the CSS margin gap, insert a paragraph between them.
            const dom = view.domAtPos(nodePos);
            const blockDom = dom.node instanceof HTMLElement
              ? dom.node
              : dom.node.parentElement;
            if (!blockDom) return false;

            const wrapper = blockDom.closest('.tableWrapper') || blockDom.closest('table');
            if (!wrapper) return false;

            const rect = wrapper.getBoundingClientRect();
            const clickY = event.clientY;

            // Click is in the bottom margin — check if there's an adjacent table below
            if (clickY > rect.bottom) {
              const $pos = view.state.doc.resolve(nodePos);
              const afterPos = $pos.after($pos.depth);
              const nodeAfter = view.state.doc.nodeAt(afterPos);
              if (nodeAfter) {
                // Insert paragraph between this block and the next
                editor.chain()
                  .insertContentAt(afterPos, { type: 'paragraph' })
                  .setTextSelection(afterPos + 1)
                  .focus()
                  .run();
                return true;
              }
            }

            // Click is in the top margin — check if there's an adjacent table above
            if (clickY < rect.top) {
              const $pos = view.state.doc.resolve(nodePos);
              const beforePos = $pos.before($pos.depth);
              if (beforePos > 0) {
                editor.chain()
                  .insertContentAt(beforePos, { type: 'paragraph' })
                  .setTextSelection(beforePos + 1)
                  .focus()
                  .run();
                return true;
              }
            }

            return false;
          },
        },
      }),
    ];
  },
});
