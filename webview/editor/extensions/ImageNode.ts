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
import { ReactNodeViewRenderer } from '@tiptap/react';
import ImageNodeView from './ImageNodeView';

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

          // Ensure image is on its own line (block element)
          state.ensureNewLine();
          state.write(`![${altWithDimensions}](${escapedSrc})`);
          state.ensureNewLine();
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

            const [, rawAlt, src, title] = match;
            const { alt, width, height } = parseAltWithDimensions(rawAlt);

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
              width: width || null,
              height: height || null,
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
