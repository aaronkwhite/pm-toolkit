/**
 * Lightweight Tiptap Editor for Card Descriptions
 *
 * Reuses core Tiptap extensions for markdown editing in the card modal
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import { ImageNode } from '../editor/extensions/ImageNode';

export interface CardEditorOptions {
  element: HTMLElement;
  content: string;
  placeholder?: string;
  onUpdate?: (markdown: string) => void;
}

/**
 * Create a Tiptap editor instance for card descriptions
 */
export function createCardEditor(options: CardEditorOptions): Editor {
  const { element, content, placeholder = 'Add a description...', onUpdate } = options;

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        // Allow all heading levels in card descriptions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      ImageNode.configure({
        inline: false,
        allowBase64: true,
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: 'card-tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        const markdown = editor.storage.markdown.getMarkdown();
        onUpdate(markdown);
      }
    },
  });

  return editor;
}

/**
 * Create a read-only Tiptap renderer for displaying markdown
 */
export function createCardRenderer(options: Omit<CardEditorOptions, 'onUpdate' | 'placeholder'>): Editor {
  const { element, content } = options;

  const editor = new Editor({
    element,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      ImageNode.configure({
        inline: false,
        allowBase64: true,
      }),
      Markdown.configure({
        html: false,
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: 'card-tiptap-renderer',
      },
    },
  });

  return editor;
}
