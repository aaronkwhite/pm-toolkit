/**
 * Slash Command Extension for Tiptap
 *
 * Notion-style "/" command menu for quick block insertion
 */

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { Editor, Range } from '@tiptap/core';
import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { SlashCommandMenu, SlashCommandMenuRef } from '../components/SlashCommandMenu';
import { TableSizePicker, type TableSize } from '../components/TableSizePicker';
import { LinkPicker, type LinkData } from '../components/LinkPicker';

/**
 * Template interface (matches src/types/index.ts)
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  icon?: string;
  content: string;
}

/**
 * Command item definition
 */
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  searchTerms: string[];
  category?: 'style' | 'lists' | 'blocks' | 'media' | 'templates';
  command: (params: { editor: Editor; range: Range }) => void;
}

/**
 * Variable substitution for templates
 */
function substituteVariables(content: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const year = now.getFullYear().toString();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  return content
    .split('{{date}}').join(`${year}-${month}-${day}`)
    .split('{{time}}').join(`${hours}:${minutes}:${seconds}`)
    .split('{{datetime}}').join(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`)
    .split('{{year}}').join(year)
    .split('{{month}}').join(month)
    .split('{{day}}').join(day);
}

/**
 * Global templates storage - updated by webview message handler
 */
let loadedTemplates: Template[] = [];

/**
 * Set templates (called from main.ts when templates are received)
 */
export function setTemplates(templates: Template[]): void {
  loadedTemplates = templates;
}

/**
 * Get current templates
 */
export function getTemplates(): Template[] {
  return loadedTemplates;
}

/**
 * Convert templates to slash command items
 */
function templateToCommandItem(template: Template): SlashCommandItem {
  return {
    title: template.name,
    description: template.description || 'Insert template',
    icon: template.icon || '📄',
    searchTerms: [
      template.name.toLowerCase(),
      template.id.toLowerCase(),
      'template',
    ],
    category: 'templates',
    command: ({ editor, range }) => {
      // Substitute variables and insert content
      const content = substituteVariables(template.content);

      // Delete the slash command and insert template content as markdown
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent(content)
        .run();
    },
  };
}

/**
 * Lucide icon SVG helper (24x24, stroke-based)
 */
const icon = (paths: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

// --- Lucide icon paths ---
const ICON = {
  text:       icon('<path d="M17 6.1H3"/><path d="M21 12.1H3"/><path d="M15.1 18H3"/>'),
  heading1:   icon('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/>'),
  heading2:   icon('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21.1 18h-4.6c.7-1.3 4.5-3.6 4.5-5.8 0-2-1.3-2.7-2.7-2.7-1.2 0-2.2.6-2.7 1.5"/>'),
  heading3:   icon('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/>'),
  heading4:   icon('<path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17 10v4h4"/><path d="M21 10v8"/>'),
  bulletList: icon('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="3.5" cy="18" r="1.5" fill="currentColor" stroke="none"/>'),
  numberedList: icon('<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
  taskList:   icon('<rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3.5 5.5 7.5 7.5"/><line x1="13" y1="6" x2="21" y2="6"/><rect x="3" y="14" width="6" height="6" rx="1"/><line x1="13" y1="17" x2="21" y2="17"/>'),
  quote:      icon('<path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>'),
  codeBlock:  icon('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
  divider:    icon('<path d="M3 12h18"/>'),
  table:      icon('<path d="M12 3v18"/><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/>'),
  image:      icon('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'),
  mermaid:    icon('<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>'),
  flowchart:  icon('<rect width="8" height="6" x="8" y="2" rx="1"/><rect width="8" height="6" x="2" y="16" rx="1"/><rect width="8" height="6" x="14" y="16" rx="1"/><path d="M12 8v4"/><path d="M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>'),
  sequence:   icon('<path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/>'),
  link:       icon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
};

/**
 * Default slash commands
 */
export const defaultCommands: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: ICON.text,
    category: 'style',
    searchTerms: ['text', 'paragraph', 'p'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: ICON.heading1,
    category: 'style',
    searchTerms: ['h1', 'heading1', 'title', 'large'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: ICON.heading2,
    category: 'style',
    searchTerms: ['h2', 'heading2', 'subtitle'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: ICON.heading3,
    category: 'style',
    searchTerms: ['h3', 'heading3'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Heading 4',
    description: 'Smallest section heading',
    icon: ICON.heading4,
    category: 'style',
    searchTerms: ['h4', 'heading4'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 4 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: ICON.bulletList,
    category: 'lists',
    searchTerms: ['bullet', 'ul', 'unordered', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: ICON.numberedList,
    category: 'lists',
    searchTerms: ['numbered', 'ol', 'ordered', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: ICON.taskList,
    category: 'lists',
    searchTerms: ['task', 'todo', 'checkbox', 'checklist'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quote',
    icon: ICON.quote,
    category: 'blocks',
    searchTerms: ['quote', 'blockquote', 'citation'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Fenced code block',
    icon: ICON.codeBlock,
    category: 'blocks',
    searchTerms: ['code', 'codeblock', 'pre', 'programming'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: ICON.divider,
    category: 'blocks',
    searchTerms: ['divider', 'hr', 'rule', 'line', 'separator'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table (pick size)',
    icon: ICON.table,
    category: 'blocks',
    searchTerms: ['table', 'grid'],
    command: ({ editor, range }) => {
      // Delete the slash command text first
      editor.chain().focus().deleteRange(range).run();

      // Get cursor position for picker placement
      const { view } = editor;
      const coords = view.coordsAtPos(editor.state.selection.from);
      const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);

      // Mount React TableSizePicker
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      const cleanup = () => {
        root.unmount();
        container.remove();
      };

      const onSelect = (size: TableSize) => {
        editor
          .chain()
          .focus()
          .insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })
          .run();

        // Ensure there's a paragraph after the table so user can click/navigate there
        setTimeout(() => {
          const { state } = editor;
          const { $from } = state.selection;

          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === 'table') {
              const tableEnd = $from.after(depth);
              const nodeAfter = state.doc.nodeAt(tableEnd);
              if (!nodeAfter || nodeAfter.type.name !== 'paragraph') {
                editor.chain()
                  .insertContentAt(tableEnd, { type: 'paragraph' })
                  .run();
              }
              break;
            }
          }
        }, 0);

        cleanup();
      };

      const onCancel = () => {
        editor.chain().focus().run();
        cleanup();
      };

      root.render(createElement(TableSizePicker, { rect, onSelect, onCancel }));
    },
  },
  {
    title: 'Image',
    description: 'Insert or upload an image',
    icon: ICON.image,
    category: 'media',
    searchTerms: ['image', 'img', 'picture', 'photo', 'upload'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: '', alt: '' })
        .run();

      // The image will be inserted with empty src, and the node view
      // will show the drop zone UI for uploading/linking an image.
      // Select the node so the drop zone is interactive.
      setTimeout(() => {
        const { state } = editor;
        const { selection } = state;
        const pos = selection.from - 1;

        if (pos >= 0) {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name === 'image') {
            editor.commands.setNodeSelection(pos);
          }
        }
      }, 0);
    },
  },
  {
    title: 'Mermaid Diagram',
    description: 'Insert a mermaid diagram',
    icon: ICON.mermaid,
    category: 'media',
    searchTerms: ['mermaid', 'diagram', 'flowchart', 'chart', 'graph'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertMermaidBlock()
        .run();
    },
  },
  {
    title: 'Flowchart',
    description: 'Mermaid flowchart diagram',
    icon: ICON.flowchart,
    category: 'media',
    searchTerms: ['flowchart', 'flow', 'diagram', 'mermaid'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertMermaidBlock('graph TD\n    A[Start] --> B[End]')
        .run();
    },
  },
  {
    title: 'Sequence Diagram',
    description: 'Mermaid sequence diagram',
    icon: ICON.sequence,
    category: 'media',
    searchTerms: ['sequence', 'diagram', 'mermaid', 'interaction'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertMermaidBlock('sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi')
        .run();
    },
  },
  {
    title: 'Link',
    description: 'Link to file or URL',
    icon: ICON.link,
    category: 'media',
    searchTerms: ['link', 'url', 'file', 'document', 'reference'],
    command: ({ editor, range }) => {
      const { view } = editor;
      const coords = view.coordsAtPos(range.from);
      const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);

      // Delete the slash command text and save the position
      editor.chain().focus().deleteRange(range).run();
      const insertPos = editor.state.selection.from;

      // Freeze the editor to prevent any changes while picker is open
      editor.setEditable(false);

      // Mount React LinkPicker
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);

      const cleanup = () => {
        root.unmount();
        container.remove();
      };

      const onSelect = (linkData: LinkData) => {
        editor.setEditable(true);
        setTimeout(() => {
          editor
            .chain()
            .focus()
            .insertContentAt(insertPos, {
              type: 'text',
              marks: [{ type: 'link', attrs: { href: linkData.href } }],
              text: linkData.text,
            })
            .run();
        }, 0);
        cleanup();
      };

      const onCancel = () => {
        editor.setEditable(true);
        setTimeout(() => {
          editor.chain().focus().run();
        }, 0);
        cleanup();
      };

      root.render(createElement(LinkPicker, { rect, onSelect, onCancel }));
    },
  },
];

/**
 * Plugin key for the slash command
 */
export const SlashCommandPluginKey = new PluginKey('slashCommand');

/**
 * Position the menu container relative to the cursor
 */
function updateMenuPosition(
  element: HTMLElement,
  clientRect: (() => DOMRect | null) | null
): void {
  if (!clientRect) {
    element.style.display = 'none';
    return;
  }

  const rect = clientRect();
  if (!rect) {
    element.style.display = 'none';
    return;
  }

  element.style.display = 'block';

  // Position below the cursor
  const menuRect = element.getBoundingClientRect();
  const { innerHeight, innerWidth } = window;

  let top = rect.bottom + 8;
  let left = rect.left;

  // If menu overflows the bottom, flip above cursor
  if (top + menuRect.height > innerHeight - 20) {
    top = rect.top - menuRect.height - 8;
  }

  // Never go above the viewport
  if (top < 8) {
    top = 8;
  }

  // Keep within horizontal bounds
  if (left + menuRect.width > innerWidth - 20) {
    left = innerWidth - menuRect.width - 20;
  }

  element.style.top = `${top}px`;
  element.style.left = `${left}px`;
  element.style.maxHeight = `${innerHeight - top - 20}px`;
  element.style.overflow = 'auto';
}

/**
 * Slash Command Extension
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        pluginKey: SlashCommandPluginKey,
        decorationClass: 'slash-command-decoration',
        items: ({ query }: { query: string }) => {
          const search = query.toLowerCase();

          // Filter default commands
          const filteredCommands = defaultCommands.filter((item) => {
            return (
              item.title.toLowerCase().includes(search) ||
              item.searchTerms.some((term) => term.includes(search))
            );
          });

          // Filter templates
          const templateCommands = loadedTemplates
            .map(templateToCommandItem)
            .filter((item) => {
              return (
                item.title.toLowerCase().includes(search) ||
                item.searchTerms.some((term) => term.includes(search))
              );
            });

          // Return blocks first, then templates
          return [...filteredCommands, ...templateCommands];
        },
        render: () => {
          let container: HTMLElement | null = null;
          let root: Root | null = null;
          let menuRef: SlashCommandMenuRef | null = null;
          let currentProps: SuggestionProps<SlashCommandItem> | null = null;

          const renderMenu = (props: SuggestionProps<SlashCommandItem>) => {
            if (!container || !root) return;
            currentProps = props;

            root.render(
              createElement(SlashCommandMenu, {
                ref: (ref: SlashCommandMenuRef | null) => {
                  menuRef = ref;
                },
                items: props.items,
                editor: props.editor,
                range: props.range,
                onSelect: (item: SlashCommandItem) => {
                  props.command(item);
                },
                onClose: () => {
                  // Delete the slash command range to properly exit the suggestion
                  if (currentProps) {
                    currentProps.editor
                      .chain()
                      .focus()
                      .deleteRange(currentProps.range)
                      .run();
                  }
                },
              })
            );

            // Position after React paints (createRoot renders async)
            requestAnimationFrame(() => {
              if (container) {
                updateMenuPosition(container, props.clientRect);
              }
            });
          };

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              container = document.createElement('div');
              container.className = 'slash-command-menu-container';
              document.body.appendChild(container);
              root = createRoot(container);

              renderMenu(props);
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              renderMenu(props);
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              return menuRef?.onKeyDown(props.event) || false;
            },

            onExit: () => {
              root?.unmount();
              container?.remove();
              root = null;
              container = null;
              menuRef = null;
            },
          };
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions<SlashCommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
