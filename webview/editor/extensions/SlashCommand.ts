/**
 * Slash Command Extension for Tiptap
 *
 * Notion-style "/" command menu for quick block insertion
 */

import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import { Editor, Range } from '@tiptap/core';
import { TableSizePicker } from '../components/TableSizePicker';

/**
 * Command item definition
 */
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  searchTerms: string[];
  command: (params: { editor: Editor; range: Range }) => void;
}

/**
 * Default slash commands
 */
export const defaultCommands: SlashCommandItem[] = [
  {
    title: 'Text',
    description: 'Plain text paragraph',
    icon: '¶',
    searchTerms: ['text', 'paragraph', 'p'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    searchTerms: ['h1', 'heading1', 'title', 'large'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    searchTerms: ['h2', 'heading2', 'subtitle'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    searchTerms: ['h3', 'heading3'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    searchTerms: ['bullet', 'ul', 'unordered', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    searchTerms: ['numbered', 'ol', 'ordered', 'list'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: '☐',
    searchTerms: ['task', 'todo', 'checkbox', 'checklist'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    title: 'Quote',
    description: 'Block quote',
    icon: '"',
    searchTerms: ['quote', 'blockquote', 'citation'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Fenced code block',
    icon: '<>',
    searchTerms: ['code', 'codeblock', 'pre', 'programming'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setCodeBlock().run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: '—',
    searchTerms: ['divider', 'hr', 'rule', 'line', 'separator'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a table (pick size)',
    icon: '⊞',
    searchTerms: ['table', 'grid'],
    command: ({ editor, range }) => {
      // Delete the slash command text first
      editor.chain().focus().deleteRange(range).run();

      // Get cursor position for picker placement
      const { view } = editor;
      const coords = view.coordsAtPos(editor.state.selection.from);
      const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);

      // Show table size picker
      const picker = new TableSizePicker();
      picker.show({
        rect,
        onSelect: (size) => {
          editor
            .chain()
            .focus()
            .insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })
            .run();
          picker.destroy();
        },
        onCancel: () => {
          editor.chain().focus().run();
          picker.destroy();
        },
      });
    },
  },
  {
    title: 'Image',
    description: 'Insert an image',
    icon: '🖼',
    searchTerms: ['image', 'img', 'picture', 'photo'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .setImage({ src: '', alt: '' })
        .run();

      // The image will be inserted with empty src, and the node view
      // will show the edit field. User can then type the path.
      // We need to select the image node to enter edit mode.
      // Use setTimeout to let the node be inserted first.
      setTimeout(() => {
        const { state } = editor;
        const { selection } = state;
        const pos = selection.from - 1; // Position of the just-inserted image

        if (pos >= 0) {
          const node = state.doc.nodeAt(pos);
          if (node?.type.name === 'image') {
            editor.commands.setNodeSelection(pos);
          }
        }
      }, 0);
    },
  },
];

/**
 * Plugin key for the slash command
 */
export const SlashCommandPluginKey = new PluginKey('slashCommand');

/**
 * Slash Command Menu - vanilla JS component
 */
class SlashCommandMenu {
  private element: HTMLElement;
  private items: SlashCommandItem[] = [];
  private selectedIndex = 0;
  private command: ((item: SlashCommandItem) => void) | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'slash-command-menu';
    document.body.appendChild(this.element);
  }

  update(props: {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
    clientRect: (() => DOMRect | null) | null;
  }) {
    this.items = props.items;
    this.command = props.command;
    this.selectedIndex = 0;

    this.render();
    this.updatePosition(props.clientRect);
  }

  private render() {
    if (this.items.length === 0) {
      this.element.innerHTML = `
        <div class="slash-command-empty">No results</div>
      `;
      return;
    }

    this.element.innerHTML = this.items
      .map(
        (item, index) => `
        <button
          class="slash-command-item ${index === this.selectedIndex ? 'is-selected' : ''}"
          data-index="${index}"
        >
          <span class="slash-command-icon">${item.icon}</span>
          <div class="slash-command-content">
            <span class="slash-command-title">${item.title}</span>
            <span class="slash-command-description">${item.description}</span>
          </div>
        </button>
      `
      )
      .join('');

    // Add click handlers
    this.element.querySelectorAll('.slash-command-item').forEach((el) => {
      el.addEventListener('click', () => {
        const index = parseInt(el.getAttribute('data-index') || '0', 10);
        this.selectItem(index);
      });
    });
  }

  private updatePosition(clientRect: (() => DOMRect | null) | null) {
    if (!clientRect) {
      this.element.style.display = 'none';
      return;
    }

    const rect = clientRect();
    if (!rect) {
      this.element.style.display = 'none';
      return;
    }

    this.element.style.display = 'block';

    // Position below the cursor
    const menuRect = this.element.getBoundingClientRect();
    const { innerHeight, innerWidth } = window;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Flip up if near bottom
    if (top + menuRect.height > innerHeight - 20) {
      top = rect.top - menuRect.height - 8;
    }

    // Keep within horizontal bounds
    if (left + menuRect.width > innerWidth - 20) {
      left = innerWidth - menuRect.width - 20;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
  }

  onKeyDown(event: KeyboardEvent): boolean {
    if (event.key === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
      this.render();
      return true;
    }

    if (event.key === 'ArrowUp') {
      this.selectedIndex =
        (this.selectedIndex - 1 + this.items.length) % this.items.length;
      this.render();
      return true;
    }

    if (event.key === 'Enter') {
      this.selectItem(this.selectedIndex);
      return true;
    }

    if (event.key === 'Escape') {
      this.hide();
      return true;
    }

    return false;
  }

  private selectItem(index: number) {
    const item = this.items[index];
    if (item && this.command) {
      this.command(item);
    }
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }

  destroy() {
    this.element.remove();
  }
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
        items: ({ query }: { query: string }) => {
          const search = query.toLowerCase();
          return defaultCommands.filter((item) => {
            return (
              item.title.toLowerCase().includes(search) ||
              item.searchTerms.some((term) => term.includes(search))
            );
          });
        },
        render: () => {
          let menu: SlashCommandMenu | null = null;

          return {
            onStart: (props: SuggestionProps<SlashCommandItem>) => {
              menu = new SlashCommandMenu();
              menu.update({
                items: props.items,
                command: (item) => {
                  props.command(item);
                },
                clientRect: props.clientRect,
              });
            },

            onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
              menu?.update({
                items: props.items,
                command: (item) => {
                  props.command(item);
                },
                clientRect: props.clientRect,
              });
            },

            onKeyDown: (props: { event: KeyboardEvent }) => {
              if (props.event.key === 'Escape') {
                menu?.hide();
                return true;
              }
              return menu?.onKeyDown(props.event) || false;
            },

            onExit: () => {
              menu?.destroy();
              menu = null;
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
