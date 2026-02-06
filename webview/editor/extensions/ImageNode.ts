/**
 * Custom Image Extension
 *
 * Extends Tiptap's Image extension with:
 * - textAlign attribute for alignment (left/center/right)
 * - width attribute for persisting resize
 * - Drop zone UI when src is empty (via ReactNodeViewRenderer)
 * - Resize handles on selection (forked from tiptap-extension-resize-image)
 * - Popover toolbar for alignment, replace, delete
 * - Standard markdown serialization: ![alt](url)
 *
 * Also includes an input rule to convert typed markdown ![alt](url) to images,
 * and a paste handler for image markdown text.
 */

import Image from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TextSelection } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from './ImageNodeView';

// Regex to match image markdown: ![alt](url)
const imageMarkdownRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/;

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
      textAlign: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-text-align'),
        renderHTML: (attributes) => {
          if (!attributes.textAlign) return {};
          return { 'data-text-align': attributes.textAlign };
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
          const textAlign = node.attrs.textAlign;

          const escapedSrc = src.replace(/[()]/g, '\\$&');

          state.ensureNewLine();

          // Store width/alignment as a HTML comment before the image.
          // This avoids HTML block parsing issues that break surrounding markdown.
          if (width || textAlign) {
            const parts: string[] = [];
            if (width) parts.push(`width=${width}`);
            if (textAlign) parts.push(`align=${textAlign}`);
            state.write(`<!-- image: ${parts.join(' ')} -->\n`);
          }

          state.write(`![${alt}](${escapedSrc})`);
          state.ensureNewLine();
        },
        parse: {
          updateDOM(element: HTMLElement) {
            // Find <!-- image: width=N align=X --> comments and apply to following <img>
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_COMMENT);
            const commentsToRemove: Comment[] = [];

            while (walker.nextNode()) {
              const comment = walker.currentNode as Comment;
              const match = comment.textContent?.trim().match(
                /^image:\s*(.*)/
              );
              if (!match) continue;

              const attrs = match[1];
              // Find the next <img> sibling (may be inside a <p>)
              let next: Node | null = comment.nextSibling;
              // Skip whitespace text nodes
              while (next && next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
                next = next.nextSibling;
              }

              let img: HTMLImageElement | null = null;
              if (next instanceof HTMLImageElement) {
                img = next;
              } else if (next instanceof HTMLElement) {
                img = next.querySelector('img');
              }

              if (img) {
                const widthMatch = attrs.match(/width=(\d+)/);
                const alignMatch = attrs.match(/align=(\w+)/);
                if (widthMatch) {
                  img.setAttribute('width', widthMatch[1]);
                }
                if (alignMatch) {
                  img.setAttribute('data-text-align', alignMatch[1]);
                }
              }

              commentsToRemove.push(comment);
            }

            // Remove processed comments so they don't become text nodes
            commentsToRemove.forEach((c) => c.remove());
          },
        },
      },
    };
  },

  addProseMirrorPlugins() {
    const imageType = this.type;

    // Helper function to convert image markdown to image node
    const convertImageMarkdown = (view: any, addNewline: boolean): boolean => {
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
        originalSrc: src,
        alt: alt || null,
        title: title || null,
      });

      // Insert the image
      tr.insert(matchStart, imageNode);

      // Position after the image
      const posAfterImage = matchStart + 1;

      if (addNewline) {
        // For Enter: add a new paragraph after the image
        const paragraph = state.schema.nodes.paragraph.create();
        tr.insert(posAfterImage, paragraph);
        tr.setSelection(TextSelection.create(tr.doc, posAfterImage + 1));
      } else {
        // For Space: add a space after the image
        tr.insertText(' ', posAfterImage);
        tr.setSelection(TextSelection.create(tr.doc, posAfterImage + 1));
      }

      view.dispatch(tr);
      return true;
    };

    return [
      new Plugin({
        key: new PluginKey('imageMarkdownConverter'),
        props: {
          handleKeyDown(view, event) {
            // Trigger on space or Enter
            if (event.key === ' ') {
              if (convertImageMarkdown(view, false)) {
                event.preventDefault();
                return true;
              }
            } else if (event.key === 'Enter') {
              if (convertImageMarkdown(view, true)) {
                event.preventDefault();
                return true;
              }
            }
            return false;
          },
          handlePaste(view, event, slice) {
            // Check if pasted content is plain text that looks like image markdown
            const text = event.clipboardData?.getData('text/plain');
            if (!text) return false;

            // Check if the entire pasted text is an image markdown
            const trimmed = text.trim();
            const match = trimmed.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
            if (!match) return false;

            const [, alt, src, title] = match;

            // Create and insert the image node
            const { state } = view;
            const tr = state.tr;

            // Delete any selected content first
            if (!state.selection.empty) {
              tr.deleteSelection();
            }

            const imageNode = imageType.create({
              src,
              originalSrc: src,
              alt: alt || null,
              title: title || null,
            });

            tr.replaceSelectionWith(imageNode);
            view.dispatch(tr);

            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
