/**
 * Bubble Menu Component
 *
 * Floating toolbar that appears when text is selected,
 * providing quick access to text formatting options.
 */

import { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { LinkPicker } from './LinkPicker';

/**
 * Lucide icon SVGs (16x16, stroke-width 2)
 */
const icons = {
  bold: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8"></path></svg>`,
  italic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>`,
  strikethrough: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
};

/**
 * Block type definitions
 */
interface BlockType {
  id: string;
  label: string;
  check: (editor: Editor) => boolean;
  command: (editor: Editor) => void;
}

const blockTypes: BlockType[] = [
  {
    id: 'paragraph',
    label: 'Text',
    check: (editor) => editor.isActive('paragraph') && !editor.isActive('bulletList') && !editor.isActive('orderedList') && !editor.isActive('taskList'),
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    check: (editor) => editor.isActive('heading', { level: 1 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    check: (editor) => editor.isActive('heading', { level: 2 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    check: (editor) => editor.isActive('heading', { level: 3 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bullet list',
    check: (editor) => editor.isActive('bulletList'),
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    check: (editor) => editor.isActive('orderedList'),
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'Task list',
    check: (editor) => editor.isActive('taskList'),
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    check: (editor) => editor.isActive('blockquote'),
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    check: (editor) => editor.isActive('codeBlock'),
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

/**
 * Mark button definitions
 */
interface MarkButton {
  id: string;
  icon: string;
  title: string;
  shortcut: string;
  check: (editor: Editor) => boolean;
  command: (editor: Editor) => void;
}

const markButtons: MarkButton[] = [
  {
    id: 'bold',
    icon: icons.bold,
    title: 'Bold',
    shortcut: '⌘B',
    check: (editor) => editor.isActive('bold'),
    command: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    icon: icons.italic,
    title: 'Italic',
    shortcut: '⌘I',
    check: (editor) => editor.isActive('italic'),
    command: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'strike',
    icon: icons.strikethrough,
    title: 'Strikethrough',
    shortcut: '⌘⇧S',
    check: (editor) => editor.isActive('strike'),
    command: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'code',
    icon: icons.code,
    title: 'Inline code',
    shortcut: '⌘E',
    check: (editor) => editor.isActive('code'),
    command: (editor) => editor.chain().focus().toggleCode().run(),
  },
];

/**
 * BubbleMenu Component
 */
export class BubbleMenu {
  private element: HTMLElement;
  private editor: Editor;
  private dropdownOpen = false;
  private linkPicker: LinkPicker | null = null;
  private lastFrom = -1;
  private lastTo = -1;
  private isInteracting = false;

  constructor(editor: Editor) {
    this.editor = editor;
    this.element = document.createElement('div');
    this.element.className = 'bubble-menu';
    document.body.appendChild(this.element);

    // Close dropdown on click outside
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  private handleClickOutside = (e: MouseEvent) => {
    if (this.dropdownOpen && !this.element.contains(e.target as Node)) {
      this.dropdownOpen = false;
      this.render();
    }
  };

  /**
   * Update menu visibility and position based on selection
   */
  update() {
    // Skip updates while user is interacting with the menu
    if (this.isInteracting) {
      return;
    }

    const { state } = this.editor;
    const { selection } = state;
    const { empty, from, to } = selection;

    // Hide if no selection or selection is empty
    if (empty) {
      this.hide();
      this.lastFrom = -1;
      this.lastTo = -1;
      return;
    }

    // Don't show for node selections (images, etc. have their own toolbars)
    if (selection instanceof NodeSelection) {
      this.hide();
      return;
    }

    // Don't show in code blocks
    if (this.editor.isActive('codeBlock')) {
      this.hide();
      return;
    }

    // Don't show if selection spans into a table (complex selection)
    const $from = state.doc.resolve(from);
    const $to = state.doc.resolve(to);
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === 'table') {
        this.hide();
        return;
      }
    }
    for (let d = $to.depth; d >= 0; d--) {
      if ($to.node(d).type.name === 'table') {
        this.hide();
        return;
      }
    }

    // Check if selection has actually changed
    const selectionChanged = from !== this.lastFrom || to !== this.lastTo;

    this.render();
    this.show();

    // Only reposition if selection changed
    if (selectionChanged) {
      this.lastFrom = from;
      this.lastTo = to;
      // Use requestAnimationFrame to ensure element is laid out before positioning
      requestAnimationFrame(() => {
        this.position();
      });
    }
  }

  private render() {
    const currentBlockType = this.getCurrentBlockType();

    this.element.innerHTML = `
      <div class="bubble-menu-content">
        <div class="bubble-menu-block-dropdown ${this.dropdownOpen ? 'is-open' : ''}">
          <button class="bubble-menu-block-btn" title="Change block type">
            <span class="bubble-menu-block-label">${currentBlockType.label}</span>
            ${icons.chevronDown}
          </button>
          ${this.dropdownOpen ? this.renderDropdown() : ''}
        </div>
        <div class="bubble-menu-separator"></div>
        <div class="bubble-menu-marks">
          ${markButtons.map((btn) => `
            <button
              class="bubble-menu-btn ${btn.check(this.editor) ? 'is-active' : ''}"
              data-mark="${btn.id}"
              title="${btn.title} (${btn.shortcut})"
            >
              ${btn.icon}
            </button>
          `).join('')}
          <button
            class="bubble-menu-btn ${this.editor.isActive('link') ? 'is-active' : ''}"
            data-action="link"
            title="Link (⌘K)"
          >
            ${icons.link}
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderDropdown(): string {
    return `
      <div class="bubble-menu-dropdown">
        ${blockTypes.map((type) => `
          <button
            class="bubble-menu-dropdown-item ${type.check(this.editor) ? 'is-active' : ''}"
            data-block="${type.id}"
          >
            ${type.label}
          </button>
        `).join('')}
      </div>
    `;
  }

  private attachEventListeners() {
    // Prevent mousedown from causing selection changes
    this.element.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isInteracting = true;
    });

    this.element.addEventListener('mouseup', () => {
      // Reset interaction flag after a short delay to allow the command to complete
      setTimeout(() => {
        this.isInteracting = false;
      }, 50);
    });

    // Block type dropdown toggle
    const blockBtn = this.element.querySelector('.bubble-menu-block-btn');
    blockBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropdownOpen = !this.dropdownOpen;
      this.render();
    });

    // Block type selection
    this.element.querySelectorAll('.bubble-menu-dropdown-item').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const blockId = (el as HTMLElement).dataset.block;
        const blockType = blockTypes.find((b) => b.id === blockId);
        if (blockType) {
          blockType.command(this.editor);
        }
        this.dropdownOpen = false;
        // Re-render after command completes
        setTimeout(() => this.render(), 0);
      });
    });

    // Mark buttons
    this.element.querySelectorAll('.bubble-menu-btn[data-mark]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const markId = (el as HTMLElement).dataset.mark;
        const mark = markButtons.find((m) => m.id === markId);
        if (mark) {
          mark.command(this.editor);
        }
        // Re-render after command completes to update active states
        setTimeout(() => this.render(), 0);
      });
    });

    // Link button
    const linkBtn = this.element.querySelector('.bubble-menu-btn[data-action="link"]');
    linkBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showLinkPicker();
    });
  }

  private showLinkPicker() {
    // Get selection text for link text
    const { state } = this.editor;
    const { from, to } = state.selection;
    const selectedText = state.doc.textBetween(from, to, '');

    // If already a link, remove it
    if (this.editor.isActive('link')) {
      this.editor.chain().focus().unsetLink().run();
      setTimeout(() => this.render(), 0);
      return;
    }

    // Hide bubble menu while link picker is open
    this.hide();

    // Get position for link picker
    const { view } = this.editor;
    const coords = view.coordsAtPos(from);
    const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);

    // Store selection for later use
    const savedFrom = from;
    const savedTo = to;

    // Freeze editor
    this.editor.setEditable(false);

    this.linkPicker = new LinkPicker();
    this.linkPicker.show({
      rect,
      onSelect: (linkData) => {
        this.editor.setEditable(true);

        // Apply link to selection
        setTimeout(() => {
          this.editor
            .chain()
            .focus()
            .setTextSelection({ from: savedFrom, to: savedTo })
            .setLink({ href: linkData.href })
            .run();
        }, 0);

        this.linkPicker = null;
      },
      onCancel: () => {
        this.editor.setEditable(true);
        setTimeout(() => {
          this.editor
            .chain()
            .focus()
            .setTextSelection({ from: savedFrom, to: savedTo })
            .run();
        }, 0);
        this.linkPicker = null;
      },
    });
  }

  private getCurrentBlockType(): BlockType {
    for (const type of blockTypes) {
      if (type.check(this.editor)) {
        return type;
      }
    }
    return blockTypes[0]; // Default to paragraph
  }

  private position() {
    const { view, state } = this.editor;
    const { from, to } = state.selection;

    // Get coordinates from ProseMirror
    // coordsAtPos with side parameter: -1 for before, 1 for after
    const startCoords = view.coordsAtPos(from, 1);  // Right side of char before selection
    const endCoords = view.coordsAtPos(to, -1);     // Left side of char after selection

    // Get menu dimensions
    const menuRect = this.element.getBoundingClientRect();
    const { innerWidth } = window;

    // For multi-line selections, use the full width from left of first line to right of last
    // For single-line, calculate center between start and end
    const selectionLeft = startCoords.left;
    const selectionRight = endCoords.left;
    const selectionCenter = (selectionLeft + selectionRight) / 2;
    const selectionTop = Math.min(startCoords.top, endCoords.top);
    const selectionBottom = Math.max(startCoords.bottom, endCoords.bottom);

    // Position above selection by default
    let menuTop = selectionTop - menuRect.height - 8;
    let menuLeft = selectionCenter - menuRect.width / 2;

    // Flip below if near top
    if (menuTop < 10) {
      menuTop = selectionBottom + 8;
    }

    // Keep within horizontal bounds
    if (menuLeft < 10) {
      menuLeft = 10;
    } else if (menuLeft + menuRect.width > innerWidth - 10) {
      menuLeft = innerWidth - menuRect.width - 10;
    }

    this.element.style.top = `${menuTop}px`;
    this.element.style.left = `${menuLeft}px`;
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
    this.dropdownOpen = false;
  }

  destroy() {
    document.removeEventListener('mousedown', this.handleClickOutside);
    this.linkPicker?.destroy();
    this.element.remove();
  }
}
