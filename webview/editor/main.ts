/**
 * PM Toolkit - Markdown Editor Webview
 *
 * Tiptap-based WYSIWYG editor for markdown files
 */

import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Markdown } from 'tiptap-markdown';

// VS Code webview API
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode = acquireVsCodeApi();

// Editor instance
let editor: Editor | null = null;

// Flag to prevent feedback loops
let isUpdatingFromExtension = false;

// Debounce timer
let updateTimeout: number | null = null;
const DEBOUNCE_MS = 150;

/**
 * Initialize the Tiptap editor
 */
function initEditor(container: HTMLElement, initialContent: string = '') {
  editor = new Editor({
    element: container,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start typing, or press / for commands...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'editor-table',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: true,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: initialContent,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose-editor',
      },
    },
    onUpdate: ({ editor }) => {
      // Don't send updates if we're receiving from extension
      if (isUpdatingFromExtension) return;

      // Debounce updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = window.setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown();
        vscode.postMessage({
          type: 'update',
          payload: { content: markdown },
        });
      }, DEBOUNCE_MS);
    },
  });

  return editor;
}

/**
 * Set editor content from markdown
 */
function setContent(markdown: string) {
  if (!editor) return;

  isUpdatingFromExtension = true;
  editor.commands.setContent(markdown);
  isUpdatingFromExtension = false;
}

/**
 * Initialize the application
 */
function init() {
  const container = document.getElementById('editor');
  if (!container) {
    console.error('Editor container not found');
    return;
  }

  // Initialize editor with empty content
  initEditor(container, '');

  // Signal ready to extension
  vscode.postMessage({ type: 'ready' });
}

// Handle messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      if (editor) {
        setContent(message.payload.content);
      }
      break;

    case 'update':
      if (editor) {
        // Only update if content actually differs (external change)
        const currentMarkdown = editor.storage.markdown.getMarkdown();
        if (message.payload.content !== currentMarkdown) {
          setContent(message.payload.content);
        }
      }
      break;

    case 'templates':
      console.log('Received templates:', message.payload.templates);
      // TODO: Update slash command menu with templates
      break;
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
