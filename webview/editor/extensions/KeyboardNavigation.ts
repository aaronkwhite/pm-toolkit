/**
 * Keyboard Navigation Extension
 *
 * Adds Home/End key support for cursor navigation in ProseMirror.
 * By default, ProseMirror doesn't handle Home/End keys - this extension adds that functionality.
 */

import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

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
    };
  },
});
