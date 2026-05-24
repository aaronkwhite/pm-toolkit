/**
 * Callout Block Extension for Tiptap
 *
 * Renders GitHub-style callout blocks with colored styling and icons.
 *
 * Markdown syntax:
 * > [!NOTE]
 * > This is a note callout
 *
 * Supported types: NOTE | TIP | IMPORTANT | WARNING | CAUTION
 */

import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const CALLOUT_ICONS: Record<CalloutType, string> = {
  NOTE: 'ℹ',
  TIP: '💡',
  IMPORTANT: '❗',
  WARNING: '⚠',
  CAUTION: '🚫',
};

const CALLOUT_TYPES: CalloutType[] = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION'];

function isCalloutType(value: string): value is CalloutType {
  return CALLOUT_TYPES.includes(value as CalloutType);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      /**
       * Insert a callout block
       */
      insertCallout: (calloutType?: CalloutType) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',

  group: 'block',

  content: 'block+',

  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'NOTE' as CalloutType,
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute('data-type') || 'NOTE';
          return isCalloutType(value) ? value : 'NOTE';
        },
        renderHTML: (attributes: { type: CalloutType }) => {
          return {
            'data-type': attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-callout]',
        priority: 70,
        getAttrs: (element: HTMLElement) => {
          const rawType = element.getAttribute('data-type') || 'NOTE';
          const calloutType = isCalloutType(rawType) ? rawType : 'NOTE';
          return { type: calloutType };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const calloutType = node.attrs.type as CalloutType;
    const icon = CALLOUT_ICONS[calloutType] || CALLOUT_ICONS.NOTE;
    const typeLower = calloutType.toLowerCase();

    return [
      'div',
      mergeAttributes(
        {
          'data-callout': '',
          'data-type': calloutType,
          class: `pm-callout pm-callout--${typeLower}`,
        },
        HTMLAttributes
      ),
      [
        'div',
        { class: 'pm-callout-label' },
        ['span', { class: 'pm-callout-icon' }, icon],
        calloutType,
      ],
      ['div', { class: 'pm-callout-content' }, 0],
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (calloutType: CalloutType = 'NOTE') =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type: calloutType },
            content: [{ type: 'paragraph' }],
          });
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const calloutType = (node.attrs.type as CalloutType) || 'NOTE';
          // Use wrapBlock to prefix all lines with "> "
          // The first delimiter includes the callout type header
          state.wrapBlock('> ', `> [!${calloutType}]\n> `, node, () => {
            state.renderContent(node);
          });
        },
        parse: {
          // Transform GitHub-style blockquote callouts into our custom element
          // before ProseMirror's DOMParser runs
          updateDOM(element: HTMLElement) {
            element.querySelectorAll('blockquote').forEach(blockquote => {
              const firstParagraph = blockquote.querySelector('p');
              if (!firstParagraph) return;

              const text = firstParagraph.textContent || '';
              const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
              if (!match) return;

              const calloutType = match[1].toUpperCase() as CalloutType;

              // Remove the [!TYPE] line from the first paragraph or remove the paragraph
              const remainingText = text.slice(match[0].length).trim();
              if (remainingText) {
                firstParagraph.textContent = remainingText;
              } else {
                firstParagraph.remove();
              }

              // Create the callout div replacing the blockquote
              const calloutDiv = document.createElement('div');
              calloutDiv.setAttribute('data-callout', '');
              calloutDiv.setAttribute('data-type', calloutType);

              // Move all remaining blockquote children into the callout div
              while (blockquote.firstChild) {
                calloutDiv.appendChild(blockquote.firstChild);
              }

              // Ensure at least one paragraph if empty
              if (!calloutDiv.firstChild) {
                const p = document.createElement('p');
                calloutDiv.appendChild(p);
              }

              blockquote.replaceWith(calloutDiv);
            });
          },
        },
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Mod+Enter exits the callout by inserting a paragraph after it
      'Mod-Enter': ({ editor }) => {
        const { selection } = editor.state;
        const { $from } = selection;

        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name === 'callout') {
            const calloutEnd = $from.after(depth);
            editor
              .chain()
              .insertContentAt(calloutEnd, { type: 'paragraph' })
              .setTextSelection(calloutEnd + 1)
              .run();
            return true;
          }
        }
        return false;
      },
    };
  },
});
