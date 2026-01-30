/**
 * Custom Image Extension with Obsidian-style editing
 *
 * When an image is selected/focused, it shows the raw markdown syntax
 * for direct editing. When deselected, it renders the image.
 *
 * Also includes an input rule to convert typed markdown ![alt](url) to images.
 */

import Image from '@tiptap/extension-image';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

// Regex to match image markdown: ![alt](url)
const imageMarkdownRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;

export const ImageNode = Image.extend({
  addProseMirrorPlugins() {
    const imageType = this.type;

    return [
      new Plugin({
        key: new PluginKey('imageMarkdownConverter'),
        props: {
          handleKeyDown(view, event) {
            // Only trigger on space or enter
            if (event.key !== ' ' && event.key !== 'Enter') {
              return false;
            }

            const { state } = view;
            const { selection, doc } = state;
            const { $from } = selection;

            // Get the text content of the current text block (paragraph)
            const textBlock = $from.parent;
            if (!textBlock.isTextblock) return false;

            // Get the text from the start of the block to cursor
            const textBeforeCursor = textBlock.textBetween(0, $from.parentOffset, undefined, '\ufffc');

            // Check if the text ends with image markdown pattern
            const match = textBeforeCursor.match(imageMarkdownRegex);
            if (!match) return false;

            // Make sure the match is at the end of the text
            const matchEnd = match.index! + match[0].length;
            if (matchEnd !== textBeforeCursor.length) return false;

            const [fullMatch, alt, src, title] = match;

            // Calculate positions in the document
            const blockStart = $from.start();
            const matchStart = blockStart + match.index!;
            const matchEndPos = blockStart + matchEnd;

            // Create and dispatch transaction
            const tr = state.tr;

            // Delete the matched text
            tr.delete(matchStart, matchEndPos);

            // Create the image node
            const imageNode = imageType.create({
              src,
              alt: alt || null,
              title: title || null,
            });

            // Insert the image
            tr.insert(matchStart, imageNode);

            // If space was pressed, add a space after the image
            if (event.key === ' ') {
              tr.insertText(' ', matchStart + 1);
            }

            view.dispatch(tr);

            // Prevent default behavior
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
  addNodeView() {
    return ({ node, getPos, editor }) => {
      const container = document.createElement('span');
      container.classList.add('image-node-view');

      // Image display (shown when not editing)
      const img = document.createElement('img');
      img.src = node.attrs.src || '';
      img.alt = node.attrs.alt || '';
      if (node.attrs.title) {
        img.title = node.attrs.title;
      }
      img.classList.add('editor-image');

      // Markdown edit field (shown when editing)
      const editField = document.createElement('span');
      editField.classList.add('image-markdown-edit');
      editField.contentEditable = 'true';
      editField.spellcheck = false;

      const updateEditField = () => {
        const alt = node.attrs.alt || '';
        const src = node.attrs.src || '';
        editField.textContent = `![${alt}](${src})`;
      };
      updateEditField();

      // Simple undo/redo stack for the edit field
      const undoStack: string[] = [];
      const redoStack: string[] = [];
      let lastSavedContent = editField.textContent || '';

      const saveUndoState = () => {
        const current = editField.textContent || '';
        if (current !== lastSavedContent) {
          undoStack.push(lastSavedContent);
          redoStack.length = 0; // Clear redo stack on new change
          lastSavedContent = current;
        }
      };

      const undo = () => {
        if (undoStack.length > 0) {
          const current = editField.textContent || '';
          redoStack.push(current);
          const prev = undoStack.pop()!;
          editField.textContent = prev;
          lastSavedContent = prev;
          // Move cursor to end
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(editField);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      };

      const redo = () => {
        if (redoStack.length > 0) {
          const current = editField.textContent || '';
          undoStack.push(current);
          const next = redoStack.pop()!;
          editField.textContent = next;
          lastSavedContent = next;
          // Move cursor to end
          const sel = window.getSelection();
          if (sel) {
            const range = document.createRange();
            range.selectNodeContents(editField);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      };

      // Edit field goes above the image
      container.appendChild(editField);
      container.appendChild(img);

      let isEditing = false;

      const enterEditMode = () => {
        if (isEditing) return;
        isEditing = true;
        container.classList.add('is-editing');
        updateEditField();
        // Focus and select all
        editField.focus();
        const range = document.createRange();
        range.selectNodeContents(editField);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      };

      const exitEditMode = () => {
        if (!isEditing) return;
        isEditing = false;
        container.classList.remove('is-editing');

        // Parse the markdown and update the node
        const text = (editField.textContent || '').trim();

        // Match image markdown: ![alt](url)
        const match = text.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);

        if (typeof getPos === 'function') {
          const pos = getPos();

          if (match) {
            const [, alt, src] = match;
            // Only update if something changed
            if (alt !== (node.attrs.alt || '') || src !== (node.attrs.src || '')) {
              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  alt: alt || null,
                  src: src || null,
                })
              );
              // Update the image element immediately
              img.src = src || '';
              img.alt = alt || '';
            }
          } else if (text === '' || text === '![]()') {
            // Empty or cleared - delete the node
            editor.chain()
              .deleteRange({ from: pos, to: pos + 1 })
              .focus()
              .run();
          }
          // If text doesn't match pattern, revert to original values
          else {
            updateEditField();
          }
        }
      };

      // Click on image enters edit mode
      img.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof getPos === 'function') {
          editor.commands.setNodeSelection(getPos());
        }
        enterEditMode();
      });

      // Handle edit field events
      editField.addEventListener('blur', () => {
        exitEditMode();
      });

      editField.addEventListener('keydown', (e) => {
        // Handle Cmd+V / Ctrl+V for paste via VS Code API
        if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
          e.preventDefault();
          e.stopPropagation();

          // Request clipboard from VS Code extension
          const vscodeApi = (window as any).vscode;
          if (vscodeApi) {
            (window as any).__pendingPasteTarget = editField;
            vscodeApi.postMessage({ type: 'requestClipboard' });
          }
          return;
        }

        // Cmd+Z / Ctrl+Z for undo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          undo();
          return;
        }

        // Cmd+Shift+Z / Ctrl+Y for redo
        if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
          e.preventDefault();
          e.stopPropagation();
          redo();
          return;
        }

        // Allow Cmd+A / Ctrl+A for select all
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
          e.stopPropagation();
          return;
        }

        // Allow Cmd+C / Ctrl+C for copy
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          e.stopPropagation();
          // Let the browser handle copy
          return;
        }

        // Allow Cmd+X / Ctrl+X for cut
        if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
          e.stopPropagation();
          // Let the browser handle cut
          return;
        }

        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
          exitEditMode();
          editor.commands.focus();
          return;
        }

        // Arrow keys: navigate within the field
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.stopPropagation();

          const sel = window.getSelection();
          if (!sel) return;

          // Shift+Arrow for selection
          if (e.shiftKey) {
            // Let the browser handle shift+arrow for selection
            return;
          }

          // Up arrow: move to start
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            const range = document.createRange();
            range.setStart(editField, 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }

          // Down arrow: move to end
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(editField);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }

          // Left/Right: let browser handle naturally
          return;
        }

        // Delete the image if user clears all text and presses backspace/delete
        const text = editField.textContent || '';
        const isEmpty = text === '' || text.trim() === '';

        if ((e.key === 'Backspace' || e.key === 'Delete') && isEmpty) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            isEditing = false;
            container.classList.remove('is-editing');
            editor.chain()
              .deleteRange({ from: pos, to: pos + 1 })
              .focus()
              .run();
          }
          return;
        }

        // Allow normal editing keys
        e.stopPropagation();
      });

      // Prevent other events from bubbling
      editField.addEventListener('keyup', (e) => e.stopPropagation());
      editField.addEventListener('keypress', (e) => e.stopPropagation());

      // Save undo state on input (debounced)
      let undoTimeout: ReturnType<typeof setTimeout> | null = null;
      editField.addEventListener('input', () => {
        if (undoTimeout) clearTimeout(undoTimeout);
        undoTimeout = setTimeout(saveUndoState, 300);
      });

      return {
        dom: container,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'image') {
            return false;
          }
          // Update image
          img.src = updatedNode.attrs.src || '';
          img.alt = updatedNode.attrs.alt || '';
          if (updatedNode.attrs.title) {
            img.title = updatedNode.attrs.title;
          }
          // Update node reference for edit field
          node = updatedNode;
          if (!isEditing) {
            updateEditField();
          }
          return true;
        },
        selectNode: () => {
          container.classList.add('is-selected');
          enterEditMode();
        },
        deselectNode: () => {
          container.classList.remove('is-selected');
          exitEditMode();
        },
        stopEvent: (event) => {
          // Let the edit field handle its own events when editing
          if (isEditing && container.contains(event.target as Node)) {
            return true;
          }
          return false;
        },
      };
    };
  },
});
