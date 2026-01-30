/**
 * Custom Image Extension with Obsidian-style editing
 *
 * When an image is selected/focused, it shows the raw markdown syntax
 * for direct editing. When deselected, it renders the image.
 *
 * Supports Obsidian-style dimensions: ![alt|300](url) or ![alt|300x200](url)
 *
 * Also includes an input rule to convert typed markdown ![alt](url) to images.
 */

import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';

// Regex to match image markdown: ![alt](url) or ![alt|width](url) or ![alt|widthxheight](url)
const imageMarkdownRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;

/**
 * Parse Obsidian-style alt text to extract actual alt and dimensions
 * Examples:
 *   "my image" -> { alt: "my image", width: null, height: null }
 *   "my image|300" -> { alt: "my image", width: 300, height: null }
 *   "my image|300x200" -> { alt: "my image", width: 300, height: 200 }
 *   "|300" -> { alt: "", width: 300, height: null }
 */
function parseAltWithDimensions(altText: string): {
  alt: string;
  width: number | null;
  height: number | null;
} {
  if (!altText) {
    return { alt: '', width: null, height: null };
  }

  // Check for pipe separator
  const pipeIndex = altText.lastIndexOf('|');
  if (pipeIndex === -1) {
    return { alt: altText, width: null, height: null };
  }

  const alt = altText.substring(0, pipeIndex);
  const dimensionPart = altText.substring(pipeIndex + 1);

  // Try to parse dimensions: "300" or "300x200"
  const dimensionMatch = dimensionPart.match(/^(\d+)(?:x(\d+))?$/);
  if (!dimensionMatch) {
    // Not valid dimensions, treat entire string as alt
    return { alt: altText, width: null, height: null };
  }

  const width = parseInt(dimensionMatch[1], 10);
  const height = dimensionMatch[2] ? parseInt(dimensionMatch[2], 10) : null;

  return { alt, width, height };
}

/**
 * Format alt text with dimensions for markdown output
 */
function formatAltWithDimensions(
  alt: string,
  width: number | null,
  height: number | null
): string {
  if (!width && !height) {
    return alt;
  }

  const dimensionStr = height ? `${width}x${height}` : `${width}`;
  return alt ? `${alt}|${dimensionStr}` : `|${dimensionStr}`;
}

export const ImageNode = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      originalSrc: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-original-src'),
        renderHTML: (attributes) => {
          if (!attributes.originalSrc) return {};
          return { 'data-original-src': attributes.originalSrc };
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width');
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height');
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const alt = node.attrs.alt || '';
          // Use originalSrc for serialization (the user-friendly path), falling back to src
          const src = node.attrs.originalSrc || node.attrs.src || '';
          const width = node.attrs.width;
          const height = node.attrs.height;

          // Format with Obsidian-style dimensions
          const altWithDimensions = formatAltWithDimensions(alt, width, height);

          // Escape special characters in URL
          const escapedSrc = src.replace(/[()]/g, '\\$&');

          state.write(`![${altWithDimensions}](${escapedSrc})`);
        },
        parse: {
          // Hook into DOM parsing to extract dimensions from alt text
          updateDOM(element: HTMLElement) {
            // Find all images and process their alt text for dimensions
            element.querySelectorAll('img').forEach((img) => {
              const rawAlt = img.getAttribute('alt') || '';
              const { alt, width, height } = parseAltWithDimensions(rawAlt);

              // Update the alt to remove dimension syntax
              if (alt !== rawAlt) {
                img.setAttribute('alt', alt);
              }

              // Set width/height attributes if present
              if (width) {
                img.setAttribute('width', String(width));
              }
              if (height) {
                img.setAttribute('height', String(height));
              }
            });
          },
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const imageType = this.type;

    return [
      new Plugin({
        key: new PluginKey('imageMarkdownConverter'),
        props: {
          handleKeyDown(view, event) {
            // Only trigger on space (Enter will just create a new line with the text)
            if (event.key !== ' ') {
              return false;
            }

            const { state } = view;
            const { selection } = state;
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

            const [fullMatch, rawAlt, src, title] = match;

            // Parse alt text for dimensions
            const { alt, width, height } = parseAltWithDimensions(rawAlt);

            // Calculate positions in the document
            const blockStart = $from.start();
            const matchStart = blockStart + match.index!;
            const matchEndPos = blockStart + matchEnd;

            // Create and dispatch transaction
            const tr = state.tr;

            // Delete the matched text
            tr.delete(matchStart, matchEndPos);

            // Create the image node with dimensions
            // Store originalSrc for user-friendly display/editing
            const imageNode = imageType.create({
              src,
              originalSrc: src, // User typed this path, preserve it
              alt: alt || null,
              title: title || null,
              width: width || null,
              height: height || null,
            });

            // Insert the image
            tr.insert(matchStart, imageNode);

            // Position after the image
            const posAfterImage = matchStart + 1;

            // Add a space after the image and position cursor
            tr.insertText(' ', posAfterImage);
            tr.setSelection(TextSelection.create(tr.doc, posAfterImage + 1));

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

      // Helper to check if a URL is a webview URL (can be rendered)
      const isWebviewUrl = (url: string) => {
        return url.startsWith('http') || url.startsWith('data:') || url.includes('vscode-resource');
      };

      // Helper to request URL conversion from extension
      const requestUrlConversion = (relativePath: string) => {
        const vscodeApi = (window as any).vscode;
        if (vscodeApi && relativePath && !isWebviewUrl(relativePath)) {
          vscodeApi.postMessage({ type: 'requestImageUrl', payload: { path: relativePath } });
        }
      };

      // Image display (shown when not editing)
      const img = document.createElement('img');
      const initialSrc = node.attrs.src || '';
      img.alt = node.attrs.alt || '';
      if (node.attrs.title) {
        img.title = node.attrs.title;
      }
      // Apply dimensions
      if (node.attrs.width) {
        img.width = node.attrs.width;
      }
      if (node.attrs.height) {
        img.height = node.attrs.height;
      }
      img.classList.add('editor-image');

      // Track the path we're waiting for conversion on
      let pendingPath = '';

      // Set image src - if it's not a webview URL, request conversion
      if (isWebviewUrl(initialSrc)) {
        img.src = initialSrc;
      } else if (initialSrc) {
        // Relative path - request conversion and show placeholder
        img.src = ''; // Will be updated when we get the webview URL
        pendingPath = initialSrc;
        requestUrlConversion(initialSrc);
      }

      // Listen for URL resolution from extension
      const handleUrlResolved = (event: Event) => {
        const customEvent = event as CustomEvent<{ originalPath: string; webviewUrl: string }>;
        const { originalPath, webviewUrl } = customEvent.detail;

        // Check if this is the path we're waiting for
        if (pendingPath && originalPath === pendingPath) {
          img.src = webviewUrl;
          pendingPath = '';

          // Update the node attributes with the resolved URL
          if (typeof getPos === 'function') {
            const pos = getPos();
            editor.view.dispatch(
              editor.state.tr
                .setMeta('addToHistory', false) // Don't add to undo history
                .setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  src: webviewUrl,
                  originalSrc: originalPath,
                })
            );
          }
        }
      };

      window.addEventListener('image-url-resolved', handleUrlResolved);

      // Markdown edit field (shown when editing)
      const editField = document.createElement('span');
      editField.classList.add('image-markdown-edit');
      editField.contentEditable = 'true';
      editField.spellcheck = false;

      const updateEditField = () => {
        const alt = node.attrs.alt || '';
        // Display originalSrc (the user-friendly path) instead of the webview URL
        const displaySrc = node.attrs.originalSrc || node.attrs.src || '';
        const width = node.attrs.width;
        const height = node.attrs.height;
        const altWithDimensions = formatAltWithDimensions(alt, width, height);
        editField.textContent = `![${altWithDimensions}](${displaySrc})`;
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
        editField.focus();

        const text = editField.textContent || '';
        const sel = window.getSelection();
        const range = document.createRange();

        // If empty image (no alt, no src), position cursor in alt text area (between [ and ])
        if (text === '![]()') {
          const textNode = editField.firstChild;
          if (textNode && sel) {
            // Position cursor after "![" (at position 2)
            range.setStart(textNode, 2);
            range.setEnd(textNode, 2);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else {
          // Select all for non-empty images
          range.selectNodeContents(editField);
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      };

      const exitEditMode = () => {
        if (!isEditing) return;
        isEditing = false;
        container.classList.remove('is-editing');

        // Parse the markdown and update the node
        const text = (editField.textContent || '').trim();

        // Match image markdown: ![alt](url) - alt may contain |dimensions
        const match = text.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);

        if (typeof getPos === 'function') {
          const pos = getPos();

          if (match) {
            const [, rawAlt, newSrc] = match;
            const { alt, width, height } = parseAltWithDimensions(rawAlt);

            // Compare against originalSrc (what user sees) not src (webview URL)
            const currentDisplaySrc = node.attrs.originalSrc || node.attrs.src || '';

            // Check if anything changed
            const altChanged = alt !== (node.attrs.alt || '');
            const srcChanged = newSrc !== currentDisplaySrc;
            const widthChanged = width !== node.attrs.width;
            const heightChanged = height !== node.attrs.height;

            if (altChanged || srcChanged || widthChanged || heightChanged) {
              // Update attributes - only modify originalSrc, keep src (webview URL) intact
              // The markdown serializer uses originalSrc, so saving will write the correct path
              const newAttrs: Record<string, any> = {
                ...node.attrs,
                alt: alt || null,
                width: width,
                height: height,
              };

              if (srcChanged) {
                // User changed the path - update originalSrc and request URL conversion
                newAttrs.originalSrc = newSrc || null;
                // Request conversion of the new path to webview URL
                if (newSrc && !isWebviewUrl(newSrc)) {
                  pendingPath = newSrc;
                  requestUrlConversion(newSrc);
                }
              }

              editor.view.dispatch(
                editor.state.tr.setNodeMarkup(pos, undefined, newAttrs)
              );
              // Update the img element
              img.alt = alt || '';
              if (width) {
                img.width = width;
              } else {
                img.removeAttribute('width');
              }
              if (height) {
                img.height = height;
              } else {
                img.removeAttribute('height');
              }
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

        // Handle Cmd+C / Ctrl+C for copy via VS Code API
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          e.preventDefault();
          e.stopPropagation();

          const sel = window.getSelection();
          if (sel && sel.toString()) {
            const textToCopy = sel.toString();
            const vscodeApi = (window as any).vscode;
            if (vscodeApi) {
              vscodeApi.postMessage({ type: 'copyToClipboard', payload: { text: textToCopy } });
            }
          }
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
          // Update image - check if we need URL conversion
          const newSrc = updatedNode.attrs.src || '';
          if (isWebviewUrl(newSrc)) {
            img.src = newSrc;
          } else if (newSrc && newSrc !== pendingPath) {
            // New relative path - request conversion
            img.src = ''; // Clear while loading
            pendingPath = newSrc;
            requestUrlConversion(newSrc);
          }
          img.alt = updatedNode.attrs.alt || '';
          if (updatedNode.attrs.title) {
            img.title = updatedNode.attrs.title;
          }
          // Update dimensions
          if (updatedNode.attrs.width) {
            img.width = updatedNode.attrs.width;
          } else {
            img.removeAttribute('width');
          }
          if (updatedNode.attrs.height) {
            img.height = updatedNode.attrs.height;
          } else {
            img.removeAttribute('height');
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
        destroy: () => {
          // Clean up event listener
          window.removeEventListener('image-url-resolved', handleUrlResolved);
        },
      };
    };
  },
});
