/**
 * Mermaid Diagram Extension for Tiptap
 *
 * Renders mermaid code blocks as interactive SVG diagrams.
 * Click to toggle between view mode (rendered diagram) and edit mode (raw code).
 *
 * Supports standard markdown fenced code blocks with 'mermaid' language:
 * ```mermaid
 * graph TD
 *   A --> B
 * ```
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { MermaidNodeView } from './MermaidNodeView';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Insert a mermaid diagram block
       */
      insertMermaidBlock: (content?: string) => ReturnType;
    };
  }
}

export const MermaidNode = Node.create({
  name: 'mermaid',

  group: 'block',

  // Atom node - content is stored in attributes, not as child text nodes
  atom: true,

  marks: '',

  code: true,

  defining: true,

  addAttributes() {
    return {
      content: {
        default: 'graph TD\n    A[Start] --> B[End]',
        // parseHTML is handled by the node-level parseHTML() with getAttrs
        // No need to define it here
        renderHTML: (attributes) => {
          // Don't render content as HTML attribute - it's stored internally
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      // Handle our own rendered output (pre with data-type="mermaid")
      {
        tag: 'pre[data-type="mermaid"]',
        getAttrs: (element: HTMLElement) => {
          const code = element.querySelector('code');
          const content = code?.textContent || element.textContent || '';
          return { content };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['pre', mergeAttributes({ 'data-type': 'mermaid' }, HTMLAttributes), ['code', 0]];
  },

  addCommands() {
    return {
      insertMermaidBlock:
        (content?: string) =>
        ({ commands }) => {
          const defaultContent = content || 'graph TD\n    A[Start] --> B[End]';
          return commands.insertContent({
            type: this.name,
            attrs: { content: defaultContent },
          });
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          // Get content from node attributes (atom node stores content in attrs)
          const content = node.attrs.content || '';
          state.write('```mermaid\n');
          state.text(content, false);
          state.ensureNewLine();
          state.write('```');
          state.closeBlock(node);
        },
        // We use appendTransaction plugin to convert codeBlocks after parse
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Allow Enter to create a new paragraph after the mermaid node
      Enter: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.from);

        if (node?.type.name === 'mermaid') {
          // Insert a paragraph after the mermaid node
          const pos = selection.from + node.nodeSize;
          editor.chain()
            .insertContentAt(pos, { type: 'paragraph' })
            .setTextSelection(pos + 1)
            .run();
          return true;
        }
        return false;
      },
      // Allow ArrowDown to move cursor after the mermaid node
      ArrowDown: ({ editor }) => {
        const { selection } = editor.state;
        const node = editor.state.doc.nodeAt(selection.from);

        if (node?.type.name === 'mermaid') {
          const pos = selection.from + node.nodeSize;
          // If there's no content after, insert a paragraph
          if (pos >= editor.state.doc.content.size - 1) {
            editor.chain()
              .insertContentAt(pos, { type: 'paragraph' })
              .setTextSelection(pos + 1)
              .run();
          } else {
            editor.commands.setTextSelection(pos);
          }
          return true;
        }
        return false;
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView);
  },

  addProseMirrorPlugins() {
    const mermaidType = this.type;

    return [
      new Plugin({
        key: new PluginKey('mermaidTransformer'),
        appendTransaction: (transactions, oldState, newState) => {
          // Skip if this is already a mermaid transformation (prevent infinite loop)
          if (transactions.some(tr => tr.getMeta('mermaidTransform'))) {
            return null;
          }

          // Only process if document changed
          if (!transactions.some(tr => tr.docChanged)) {
            return null;
          }

          // Collect all mermaid codeBlocks that need transformation
          const replacements: { pos: number; nodeSize: number; content: string }[] = [];

          newState.doc.descendants((node, pos) => {
            if (node.type.name === 'codeBlock' && node.attrs.language === 'mermaid') {
              let content = node.textContent;

              // Check if this is a placeholder that needs to be resolved
              const placeholderMatch = content.match(/^___MERMAID_BLOCK_(\d+)___$/);
              if (placeholderMatch) {
                const index = parseInt(placeholderMatch[1], 10);
                const mermaidBlocks = (window as any).__mermaidBlocks || [];
                if (mermaidBlocks[index]) {
                  content = mermaidBlocks[index];
                }
              }

              replacements.push({
                pos,
                nodeSize: node.nodeSize,
                content,
              });
              return false; // Don't descend into this node
            }
            return true;
          });

          if (replacements.length === 0) {
            return null;
          }

          const tr = newState.tr;

          // Process in reverse order to maintain correct positions
          for (let i = replacements.length - 1; i >= 0; i--) {
            const { pos, nodeSize, content } = replacements[i];
            const mermaidNode = mermaidType.create({ content });
            tr.replaceWith(pos, pos + nodeSize, mermaidNode);
          }

          tr.setMeta('addToHistory', false);
          tr.setMeta('mermaidTransform', true);
          return tr;
        },
      }),
    ];
  },
});
