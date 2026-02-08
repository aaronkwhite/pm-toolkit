/**
 * Slash Command Extension for Tiptap
 *
 * Notion-style "/" command menu for quick block insertion
 */

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { Editor, Range } from '@tiptap/core';
import { createElement, type ReactNode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Text, Heading1, Heading2, Heading3, Heading4,
  List, ListOrdered, ListTodo, Quote, Code, Minus,
  Table, Image, LayoutTemplate, Network, ArrowRightLeft, Link, FileText,
} from 'lucide';
import { LucideIcon } from '../components/LucideIcon';
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
  icon: ReactNode;
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
    icon: template.icon || slashIcon(FileText),
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
 * Create a LucideIcon ReactNode for use in slash command items
 */
const slashIcon = (icon: import('lucide').IconNode): ReactNode =>
  createElement(LucideIcon, { icon, size: 18 });

const ICON = {
  text:         slashIcon(Text),
  heading1:     slashIcon(Heading1),
  heading2:     slashIcon(Heading2),
  heading3:     slashIcon(Heading3),
  heading4:     slashIcon(Heading4),
  bulletList:   slashIcon(List),
  numberedList: slashIcon(ListOrdered),
  taskList:     slashIcon(ListTodo),
  quote:        slashIcon(Quote),
  codeBlock:    slashIcon(Code),
  divider:      slashIcon(Minus),
  table:        slashIcon(Table),
  image:        slashIcon(Image),
  mermaid:      slashIcon(LayoutTemplate),
  flowchart:    slashIcon(Network),
  sequence:     slashIcon(ArrowRightLeft),
  link:         slashIcon(Link),
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
