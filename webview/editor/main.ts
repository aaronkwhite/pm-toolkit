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
import { SlashCommand } from './extensions/SlashCommand';
import { KeyboardNavigation } from './extensions/KeyboardNavigation';

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
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        onReadOnlyChecked: (node, checked) => {
          // Allow checking even in scenarios where editor might be readonly
          return true;
        },
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
      SlashCommand,
      KeyboardNavigation,
    ],
    content: initialContent,
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'prose-editor',
      },
      // Clean up pasted text - handle common markdown documentation artifacts
      transformPastedText(text) {
        return text
          // Replace middle dot (⋅) used in markdown docs to show spaces
          .replace(/⋅/g, ' ')
          // Replace other common "visible space" characters
          .replace(/·/g, ' ')  // middle dot U+00B7
          .replace(/␣/g, ' '); // open box U+2423
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
 * @param markdown - The markdown content to set
 * @param addToHistory - Whether to add this change to undo history (default: false for external updates)
 */
function setContent(markdown: string, addToHistory: boolean = false) {
  if (!editor) return;

  isUpdatingFromExtension = true;

  // Save current cursor position
  const { from, to } = editor.state.selection;
  const docSize = editor.state.doc.content.size;

  try {
    const parsed = editor.storage.markdown.parser.parse(markdown);

    if (addToHistory) {
      // Normal set that adds to history
      editor.commands.setContent(parsed, false, { preserveWhitespace: 'full' });
    } else {
      // Set without adding to undo history
      editor.chain()
        .command(({ tr }) => {
          tr.setMeta('addToHistory', false);
          return true;
        })
        .setContent(parsed, false, { preserveWhitespace: 'full' })
        .run();
    }

    // Restore cursor position (clamped to new document size)
    const newDocSize = editor.state.doc.content.size;
    const newFrom = Math.min(from, newDocSize - 1);
    const newTo = Math.min(to, newDocSize - 1);

    // Only restore if we have valid positions
    if (newFrom >= 0 && newTo >= 0) {
      editor.commands.setTextSelection({ from: newFrom, to: newTo });
    }
  } catch (err) {
    console.error('Error setting content:', err);
    // Fallback: just set the content normally
    editor.commands.setContent(markdown);
  }

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
      if (editor && !isUpdatingFromExtension) {
        // Only update if content actually differs (external change)
        // Normalize whitespace for comparison to avoid false positives
        const currentMarkdown = editor.storage.markdown.getMarkdown();
        const incomingNormalized = message.payload.content.trim();
        const currentNormalized = currentMarkdown.trim();

        if (incomingNormalized !== currentNormalized) {
          console.log('External change detected, updating editor');
          setContent(message.payload.content, false);
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
