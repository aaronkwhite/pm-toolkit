/**
 * CommentMark Extension
 *
 * A Tiptap Mark for inline comments stored in markdown as:
 *   ==highlighted text==^[comment text]
 *
 * On load, `preprocessCommentsToHtml` converts the markdown syntax to
 * <mark data-comment="..."> HTML before Tiptap parses it.
 *
 * On save, `addStorage().markdown.serialize` emits the ==text==^[comment]
 * syntax natively via tiptap-markdown's mark serializer, so formatted text
 * (bold, italic, etc.) inside a comment round-trips correctly.
 */

import { Mark } from '@tiptap/core';

// ---------------------------------------------------------------------------
// Preprocessing — called before markdown is sent to Tiptap parser
// ---------------------------------------------------------------------------

/**
 * Convert ==text==^[comment] inline-comment syntax to
 * <mark data-comment="comment">text</mark> so Tiptap's HTML parser
 * picks it up via the mark's parseHTML rule.
 */
export function preprocessCommentsToHtml(markdown: string): string {
  return markdown.replace(
    /==((?:(?!==)[\s\S])+)==\^\[([^\]]*)\]/g,
    (_match, text, comment) =>
      `<mark data-comment="${comment.replace(/"/g, '&quot;')}">${text}</mark>`
  );
}

// ---------------------------------------------------------------------------
// Serialization helper — called when building markdown from a comment mark
// ---------------------------------------------------------------------------

/**
 * Wrap highlighted text + comment in the ==text==^[comment] markdown syntax.
 */
export function serializeCommentMark(highlightedText: string, commentText: string): string {
  return `==${highlightedText}==^[${commentText}]`;
}

// ---------------------------------------------------------------------------
// Comment parsing — extracts all comments from raw markdown (for CommentsPanel)
// ---------------------------------------------------------------------------

export interface ParsedComment {
  id: string;
  highlightText: string;
  commentText: string;
}

/**
 * Parse ==text==^[comment] occurrences from a markdown string and return
 * an array of ParsedComment objects suitable for the CommentsPanel.
 */
export function parseCommentsFromMarkdown(markdown: string): ParsedComment[] {
  const comments: ParsedComment[] = [];
  const inlinePattern = /==((?:(?!==)[\s\S])+)==\^\[([^\]]*)\]/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = inlinePattern.exec(markdown)) !== null) {
    comments.push({
      id: `comment-${idx++}`,
      highlightText: m[1],
      commentText: m[2],
    });
  }
  return comments;
}

// ---------------------------------------------------------------------------
// Tiptap Mark definition
// ---------------------------------------------------------------------------

export const CommentMark = Mark.create({
  name: 'comment',

  addAttributes() {
    return {
      commentText: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment]',
        getAttrs: (el) => ({
          commentText: (el as HTMLElement).getAttribute('data-comment'),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'mark',
      { 'data-comment': HTMLAttributes.commentText, class: 'pm-comment-mark' },
      0,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '==',
          close(_state: any, mark: any) {
            const commentText = mark.attrs.commentText ?? ''
            return `==${commentText ? `^[${commentText}]` : ''}`
          },
          mixable: true,
          expelEnclosingWhitespace: true,
        },
        parse: {
          updateDOM(_element: HTMLElement) {
            // Handled by preprocessCommentsToHtml before setContent
          },
        },
      },
    }
  },
});
