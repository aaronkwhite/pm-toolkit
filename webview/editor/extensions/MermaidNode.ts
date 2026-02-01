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
import { Plugin, PluginKey } from '@tiptap/pm/state';
import mermaid from 'mermaid';

// Initialize mermaid with VS Code theme-aware settings
let mermaidInitialized = false;

function initMermaid() {
  if (mermaidInitialized) return;

  // Detect if dark theme from body classes or background
  const isDark = document.body.classList.contains('vscode-dark') ||
    getComputedStyle(document.body).backgroundColor.match(/rgb\((\d+)/)?.[1] === '0' ||
    parseInt(getComputedStyle(document.body).backgroundColor.match(/rgb\((\d+)/)?.[1] || '255') < 128;

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    themeVariables: isDark ? {
      // Dark theme with good contrast
      primaryColor: '#4a9eff',
      primaryTextColor: '#ffffff',
      primaryBorderColor: '#4a9eff',
      lineColor: '#888888',
      secondaryColor: '#3c3c3c',
      tertiaryColor: '#2d2d2d',
      background: '#1e1e1e',
      mainBkg: '#3c3c3c',
      nodeBorder: '#888888',
      clusterBkg: '#2d2d2d',
      clusterBorder: '#888888',
      titleColor: '#ffffff',
      edgeLabelBackground: '#2d2d2d',
      // Text colors for nodes
      nodeTextColor: '#ffffff',
      textColor: '#ffffff',
      // Flowchart specific
      flowchartTitleText: '#ffffff',
    } : {
      primaryColor: '#0066b8',
      primaryTextColor: '#000000',
      primaryBorderColor: '#0066b8',
      lineColor: '#333333',
      secondaryColor: '#f0f0f0',
      tertiaryColor: '#ffffff',
      nodeTextColor: '#000000',
      textColor: '#000000',
    },
  });

  mermaidInitialized = true;
}

// Re-initialize mermaid when theme changes
function setupThemeListener() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        mermaidInitialized = false;
        initMermaid();
        // Trigger re-render of all mermaid diagrams
        window.dispatchEvent(new CustomEvent('mermaid-theme-changed'));
      }
    }
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
}

// Generate unique IDs for mermaid renders
let mermaidIdCounter = 0;
function generateMermaidId(): string {
  return `mermaid-diagram-${Date.now()}-${++mermaidIdCounter}`;
}

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

  addNodeView() {
    return ({ node, getPos, editor }) => {
      initMermaid();

      const container = document.createElement('div');
      container.classList.add('mermaid-node');

      // Diagram container (shown when not editing)
      const diagramContainer = document.createElement('div');
      diagramContainer.classList.add('mermaid-diagram');

      // Edit container (shown when editing)
      const editContainer = document.createElement('div');
      editContainer.classList.add('mermaid-edit');

      const textarea = document.createElement('textarea');
      textarea.classList.add('mermaid-textarea');
      textarea.spellcheck = false;
      textarea.placeholder = 'Enter mermaid diagram code...';

      editContainer.appendChild(textarea);
      container.appendChild(diagramContainer);
      container.appendChild(editContainer);

      let isEditing = false;
      let currentContent = node.attrs.content || '';

      // Simple undo/redo stack for the textarea
      const undoStack: string[] = [];
      const redoStack: string[] = [];
      let lastSavedContent = currentContent;

      const saveUndoState = () => {
        const current = textarea.value;
        if (current !== lastSavedContent) {
          undoStack.push(lastSavedContent);
          redoStack.length = 0; // Clear redo stack on new change
          lastSavedContent = current;
        }
      };

      const undo = () => {
        if (undoStack.length > 0) {
          const current = textarea.value;
          redoStack.push(current);
          const prev = undoStack.pop()!;
          textarea.value = prev;
          lastSavedContent = prev;
          // Move cursor to end
          textarea.selectionStart = textarea.selectionEnd = prev.length;
        }
      };

      const redo = () => {
        if (redoStack.length > 0) {
          const current = textarea.value;
          undoStack.push(current);
          const next = redoStack.pop()!;
          textarea.value = next;
          lastSavedContent = next;
          // Move cursor to end
          textarea.selectionStart = textarea.selectionEnd = next.length;
        }
      };

      // Render the mermaid diagram
      async function renderDiagram() {
        const content = currentContent.trim();

        if (!content) {
          diagramContainer.innerHTML = '<div class="mermaid-placeholder">Click to add diagram</div>';
          return;
        }

        try {
          const id = generateMermaidId();
          const { svg } = await mermaid.render(id, content);
          diagramContainer.innerHTML = svg;

          // Set fixed dimensions from viewBox to prevent responsive scaling
          const svgEl = diagramContainer.querySelector('svg');
          if (svgEl) {
            const viewBox = svgEl.getAttribute('viewBox');
            if (viewBox) {
              const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number);
              if (vbWidth && vbHeight) {
                // Set explicit pixel dimensions from viewBox
                svgEl.setAttribute('width', `${vbWidth}px`);
                svgEl.setAttribute('height', `${vbHeight}px`);
                svgEl.style.width = `${vbWidth}px`;
                svgEl.style.height = `${vbHeight}px`;
                svgEl.style.minWidth = `${vbWidth}px`;
                svgEl.style.maxWidth = 'none';
              }
            }
          }
        } catch (error: any) {
          // Show error message
          diagramContainer.innerHTML = `<div class="mermaid-error">
            <div class="mermaid-error-title">Diagram Error</div>
            <div class="mermaid-error-message">${escapeHtml(error.message || 'Invalid mermaid syntax')}</div>
          </div>`;
        }
      }

      function escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function enterEditMode() {
        if (isEditing) return;
        isEditing = true;
        container.classList.add('is-editing');
        textarea.value = currentContent;
        textarea.focus();

        // Select all text for easy replacement
        textarea.select();
      }

      function exitEditMode(save: boolean = true) {
        if (!isEditing) return;
        isEditing = false;
        container.classList.remove('is-editing');

        if (save && typeof getPos === 'function') {
          const newContent = textarea.value;

          if (newContent !== currentContent) {
            currentContent = newContent;

            // Update the node content using editor chain for proper history/update handling
            const pos = getPos();
            const currentNode = editor.state.doc.nodeAt(pos);

            if (currentNode) {
              editor.chain()
                .focus()
                .command(({ tr }) => {
                  const mermaidNode = editor.schema.nodes.mermaid.create(
                    { content: newContent }
                  );
                  tr.replaceWith(pos, pos + currentNode.nodeSize, mermaidNode);
                  return true;
                })
                .run();
            }

            renderDiagram();
          }
        }
      }

      // Click on diagram enters edit mode
      diagramContainer.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        enterEditMode();
      });

      // Handle edit textarea events
      textarea.addEventListener('blur', () => {
        exitEditMode(true);
      });

      textarea.addEventListener('keydown', (e) => {
        // Handle Cmd+V / Ctrl+V for paste via VS Code API
        if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
          e.preventDefault();
          e.stopPropagation();

          // Request clipboard from VS Code extension
          const vscodeApi = (window as any).vscode;
          if (vscodeApi) {
            (window as any).__pendingPasteTarget = textarea;
            vscodeApi.postMessage({ type: 'requestClipboard' });
          }
          return;
        }

        // Cmd+Z / Ctrl+Z for undo
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          undo();
          return;
        }

        // Cmd+Shift+Z / Ctrl+Y for redo
        if ((e.metaKey || e.ctrlKey) && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
          e.preventDefault();
          e.stopPropagation();
          redo();
          return;
        }

        // Allow Cmd+A / Ctrl+A for select all
        if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
          e.stopPropagation();
          return;
        }

        // Handle Cmd+C / Ctrl+C for copy via VS Code API
        if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
          e.preventDefault();
          e.stopPropagation();

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          if (start !== end) {
            const textToCopy = textarea.value.substring(start, end);
            const vscodeApi = (window as any).vscode;
            if (vscodeApi) {
              vscodeApi.postMessage({ type: 'copyToClipboard', payload: { text: textToCopy } });
            }
          }
          return;
        }

        // Allow Cmd+X / Ctrl+X for cut
        if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
          e.preventDefault();
          e.stopPropagation();

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          if (start !== end) {
            const textToCut = textarea.value.substring(start, end);
            const vscodeApi = (window as any).vscode;
            if (vscodeApi) {
              vscodeApi.postMessage({ type: 'copyToClipboard', payload: { text: textToCut } });
            }
            // Remove the selected text
            saveUndoState();
            textarea.value = textarea.value.substring(0, start) + textarea.value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start;
          }
          return;
        }

        // Escape to exit without saving
        if (e.key === 'Escape') {
          e.preventDefault();
          textarea.value = currentContent; // Revert
          exitEditMode(false);
          editor.commands.focus();
          return;
        }

        // Cmd/Ctrl+Enter to save and exit
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          exitEditMode(true);
          editor.commands.focus();
          return;
        }

        // Tab inserts spaces (or handles shift+tab for dedent)
        if (e.key === 'Tab') {
          e.preventDefault();
          e.stopPropagation();
          saveUndoState();

          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const value = textarea.value;

          if (e.shiftKey) {
            // Dedent: remove up to 4 spaces from start of line
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const linePrefix = value.substring(lineStart, start);
            const spacesToRemove = Math.min(4, linePrefix.length - linePrefix.trimStart().length);
            if (spacesToRemove > 0) {
              textarea.value = value.substring(0, lineStart) + value.substring(lineStart + spacesToRemove);
              textarea.selectionStart = textarea.selectionEnd = start - spacesToRemove;
            }
          } else {
            // Indent: insert 4 spaces
            textarea.value = value.substring(0, start) + '    ' + value.substring(end);
            textarea.selectionStart = textarea.selectionEnd = start + 4;
          }
          return;
        }

        // Delete the node if user clears all text and presses backspace/delete
        const text = textarea.value;
        const isEmpty = text === '' || text.trim() === '';

        if ((e.key === 'Backspace' || e.key === 'Delete') && isEmpty) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof getPos === 'function') {
            const pos = getPos();
            isEditing = false;
            container.classList.remove('is-editing');
            editor.chain()
              .deleteRange({ from: pos, to: pos + node.nodeSize })
              .focus()
              .run();
          }
          return;
        }

        // Stop propagation to prevent editor from handling these keys
        e.stopPropagation();
      });

      textarea.addEventListener('keyup', (e) => e.stopPropagation());
      textarea.addEventListener('keypress', (e) => e.stopPropagation());

      // Save undo state on input (debounced)
      let undoTimeout: ReturnType<typeof setTimeout> | null = null;
      textarea.addEventListener('input', () => {
        if (undoTimeout) clearTimeout(undoTimeout);
        undoTimeout = setTimeout(saveUndoState, 300);
      });

      // Handle theme changes
      const handleThemeChange = () => {
        if (!isEditing) {
          renderDiagram();
        }
      };
      window.addEventListener('mermaid-theme-changed', handleThemeChange);

      // Initial render
      renderDiagram();

      return {
        dom: container,
        contentDOM: null,
        update: (updatedNode) => {
          if (updatedNode.type.name !== 'mermaid') {
            return false;
          }

          const newContent = updatedNode.attrs.content || '';
          if (newContent !== currentContent && !isEditing) {
            currentContent = newContent;
            renderDiagram();
          }

          return true;
        },
        selectNode: () => {
          container.classList.add('is-selected');
          enterEditMode();
        },
        deselectNode: () => {
          container.classList.remove('is-selected');
          exitEditMode(true);
        },
        stopEvent: (event) => {
          // Let the textarea handle its own events when editing
          if (isEditing && container.contains(event.target as Node)) {
            return true;
          }
          return false;
        },
        destroy: () => {
          window.removeEventListener('mermaid-theme-changed', handleThemeChange);
        },
      };
    };
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

// Setup theme listener on module load
if (typeof window !== 'undefined') {
  setupThemeListener();
}
