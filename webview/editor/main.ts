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
import { ImageNode } from './extensions/ImageNode';
import { MermaidNode } from './extensions/MermaidNode';
import { Markdown } from 'tiptap-markdown';
import { SlashCommand, setTemplates } from './extensions/SlashCommand';
import { KeyboardNavigation } from './extensions/KeyboardNavigation';
import { CustomParagraph } from './extensions/CustomParagraph';
import { TableControls } from './extensions/TableControls';
import { BubbleMenuExtension } from './extensions/BubbleMenu';

// VS Code webview API
interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

const vscode = acquireVsCodeApi();

// Expose vscode API globally for use in extensions (e.g., clipboard access)
(window as any).vscode = vscode;

// Editor instance
let editor: Editor | null = null;

// Flag to prevent feedback loops
let isUpdatingFromExtension = false;

// Flag to track if current update is from undo/redo
let isHistoryOperation = false;

// Debounce timer
let updateTimeout: number | null = null;
const DEBOUNCE_MS = 150;

/**
 * Ensure the document ends with a paragraph so users can click after block elements.
 * This prevents getting "trapped" in tables, code blocks, etc. at the end of documents.
 * Preserves the current cursor position to avoid jumping.
 */
function ensureTrailingParagraph(editor: Editor) {
  const { state, view } = editor;
  const { doc, selection, schema } = state;
  const lastNode = doc.lastChild;

  // Block elements that need a trailing paragraph
  const blockElements = ['table', 'codeBlock', 'horizontalRule', 'image'];

  // If the last node is a block element that can trap the cursor, add a paragraph
  if (lastNode && blockElements.includes(lastNode.type.name)) {
    // Create a single transaction that inserts paragraph but preserves selection
    const tr = state.tr;
    const endPos = doc.content.size;

    // Insert empty paragraph at end
    const paragraph = schema.nodes.paragraph.create();
    tr.insert(endPos, paragraph);

    // Don't add to history
    tr.setMeta('addToHistory', false);

    // Preserve original selection (map it through the transaction)
    // Since we're inserting at the end, positions before endPos are unchanged
    const { from, to } = selection;
    if (from < endPos && to < endPos) {
      // Selection is before the insertion point, restore it
      tr.setSelection(selection.map(tr.doc, tr.mapping));
    }

    view.dispatch(tr);
  }
}

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
        // Disable default paragraph so we can use CustomParagraph
        paragraph: false,
      }),
      CustomParagraph,
      Placeholder.configure({
        placeholder: 'Start typing, or press / for commands...',
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
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
      TableControls,
      ImageNode.configure({
        inline: true,
        allowBase64: true,
      }),
      MermaidNode,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,  // Disable auto-linking URLs to prevent breaking image markdown
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      SlashCommand,
      KeyboardNavigation,
      BubbleMenuExtension,
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
    onTransaction: ({ transaction }) => {
      // Track if this transaction is from undo/redo
      isHistoryOperation = !!transaction.getMeta('history$');
    },
    onCreate: ({ editor }) => {
      // Handle clicks on links - open internal links in new tab
      editor.view.dom.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        if (link) {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
            // Internal link - open file
            e.preventDefault();
            vscode.postMessage({
              type: 'openFile',
              payload: { path: href },
            });
          } else if (href && href.startsWith('http')) {
            // External link - let the extension handle it or open in browser
            e.preventDefault();
            vscode.postMessage({
              type: 'openFile',
              payload: { path: href },
            });
          }
        }
      });

      // Listen for paste events and move cursor out of block elements after paste
      editor.view.dom.addEventListener('paste', () => {
        // Use setTimeout to run after the paste has been processed
        setTimeout(() => {
          const { $head } = editor.state.selection;
          let depth = $head.depth;

          // Check if we're inside a table
          while (depth > 0) {
            const node = $head.node(depth);
            if (node.type.name === 'table') {
              // Move cursor to after the table
              const endOfTable = $head.after(depth);
              editor.commands.setTextSelection(endOfTable);
              // Insert a paragraph after the table if there isn't one
              const nodeAfter = editor.state.doc.nodeAt(endOfTable);
              if (!nodeAfter) {
                editor.commands.insertContentAt(endOfTable, { type: 'paragraph' });
              }
              return;
            }
            depth--;
          }
        }, 0);
      });
    },
    onUpdate: ({ editor }) => {
      // Don't send updates if we're receiving from extension
      if (isUpdatingFromExtension) return;

      // Skip ensureTrailingParagraph if this is an undo/redo operation
      // The flag is set by onTransaction callback above
      if (!isHistoryOperation) {
        // Ensure document ends with a paragraph (so you can click after tables/code blocks)
        ensureTrailingParagraph(editor);
      }

      // Debounce updates
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }

      updateTimeout = window.setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown();

        // Save state for potential reload recovery
        vscode.setState({ content: markdown });

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
 * Preprocess markdown to protect mermaid code blocks from newline stripping.
 * Extracts mermaid blocks and replaces them with placeholders, storing the
 * original content in window.__mermaidBlocks for the MermaidNode plugin to retrieve.
 */
function preprocessMermaidBlocks(markdown: string): string {
  const mermaidBlocks: string[] = [];
  (window as any).__mermaidBlocks = mermaidBlocks;

  // Match ```mermaid ... ``` blocks (with content preserved)
  const processed = markdown.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (match, content) => {
      const index = mermaidBlocks.length;
      mermaidBlocks.push(content.trimEnd());
      return '```mermaid\n___MERMAID_BLOCK_' + index + '___\n```';
    }
  );

  return processed;
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

  // Preprocess mermaid blocks to preserve newlines
  // The MermaidNode plugin will resolve the placeholders
  const processedMarkdown = preprocessMermaidBlocks(markdown);

  try {
    const parsed = editor.storage.markdown.parser.parse(processedMarkdown);

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

    // Ensure there's a paragraph at the end so users can click after block elements
    ensureTrailingParagraph(editor);
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

  // Try to restore state from previous session (e.g., after extension reload)
  const previousState = vscode.getState() as { content?: string } | undefined;

  // Initialize editor with empty content
  initEditor(container, '');

  // If we have previous state, use it immediately as a fallback
  // (extension will send fresh content via 'init' message anyway)
  if (previousState?.content) {
    setContent(previousState.content);
  }

  // Signal ready to extension
  vscode.postMessage({ type: 'ready' });

  // Request templates
  vscode.postMessage({ type: 'requestTemplates' });
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
      // Update templates in the slash command menu
      if (message.payload?.templates) {
        setTemplates(message.payload.templates);
      }
      break;

    case 'clipboardData':
      // Handle clipboard data from extension (for paste in contenteditable fields)
      const pasteTarget = (window as any).__pendingPasteTarget as HTMLElement | null;
      if (pasteTarget && message.payload.text) {
        const text = message.payload.text;

        // Focus the target first
        pasteTarget.focus();

        // Get current selection
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(text));
          // Move cursor to end of inserted text
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        } else {
          // Fallback: append to end
          pasteTarget.textContent = (pasteTarget.textContent || '') + text;
        }

        // Trigger input event so undo stack updates
        pasteTarget.dispatchEvent(new Event('input', { bubbles: true }));

        (window as any).__pendingPasteTarget = null;
      }
      break;

    case 'imageUrl':
      // Extension has converted a relative path to webview URL
      // Dispatch custom event for image nodes to handle
      if (message.payload?.originalPath && message.payload?.webviewUrl) {
        window.dispatchEvent(new CustomEvent('image-url-resolved', {
          detail: {
            originalPath: message.payload.originalPath,
            webviewUrl: message.payload.webviewUrl,
          },
        }));
      }
      break;

    case 'imageSaved':
      if (message.payload?.originalPath && message.payload?.webviewUrl) {
        window.dispatchEvent(new CustomEvent('image-saved', {
          detail: {
            originalPath: message.payload.originalPath,
            webviewUrl: message.payload.webviewUrl,
          },
        }));
      }
      break;

    case 'filePickerResult':
      if (message.payload?.originalPath && message.payload?.webviewUrl) {
        window.dispatchEvent(new CustomEvent('file-picker-result', {
          detail: {
            originalPath: message.payload.originalPath,
            webviewUrl: message.payload.webviewUrl,
          },
        }));
      }
      break;
  }
});

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
