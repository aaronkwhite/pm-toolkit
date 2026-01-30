/**
 * Custom Paragraph Extension
 *
 * Extends the default Paragraph to customize markdown serialization.
 * Empty paragraphs are serialized as &nbsp; (non-breaking space) to preserve
 * intentional whitespace/blank lines in markdown documents.
 *
 * This overrides tiptap-markdown's default paragraph serialization.
 */

import { Paragraph } from '@tiptap/extension-paragraph';

export const CustomParagraph = Paragraph.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Check if paragraph is truly empty (no child nodes, or only whitespace text)
          // Important: node.textContent will be empty for non-text nodes like images,
          // so we need to check childCount and content size
          const hasContent = node.childCount > 0 || node.content.size > 0;
          const textContent = node.textContent;
          const isOnlyWhitespace = !textContent || textContent.trim() === '';

          // Only treat as empty if there are no child nodes AND no text
          // This ensures images and other inline content are preserved
          if (!hasContent && isOnlyWhitespace) {
            // Output &nbsp; for empty paragraphs to preserve them
            state.write('\u00A0');
            state.closeBlock(node);
          } else if (hasContent && isOnlyWhitespace && node.childCount === 0) {
            // Edge case: content.size > 0 but no children and no text
            // This shouldn't happen, but fall back to &nbsp;
            state.write('\u00A0');
            state.closeBlock(node);
          } else {
            // Normal paragraph serialization - render all inline content
            state.renderInline(node);
            state.closeBlock(node);
          }
        },
        parse: {
          // Parsing is handled by markdown-it
        },
      },
    };
  },
});
