/**
 * ImageNodeView - React NodeView component for Tiptap Image extension
 *
 * This component provides a rich editing experience for images with:
 * - Obsidian-style dimension syntax: ![alt|300](url) or ![alt|300x200](url)
 * - Click-to-edit markdown mode showing raw syntax
 * - URL resolution via VS Code messaging for relative paths
 * - Custom undo/redo stack for the edit field (isolated from editor history)
 * - Keyboard navigation and editing within the edit field
 *
 * Migration from vanilla TypeScript NodeView to React using @tiptap/react's
 * NodeViewWrapper and ReactNodeViewRenderer.
 */

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';

// VS Code API type declaration
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
    __pendingPasteTarget?: HTMLElement;
  }
}

/**
 * Parse Obsidian-style alt text to extract actual alt and dimensions
 * Examples:
 *   "my image" -> { alt: "my image", width: null, height: null }
 *   "my image|300" -> { alt: "my image", width: 300, height: null }
 *   "my image|300x200" -> { alt: "my image", width: 300, height: 200 }
 *   "|300" -> { alt: "", width: 300, height: null }
 */
function parseAltWithDimensions(altText: string): {
  alt: string;
  width: number | null;
  height: number | null;
} {
  if (!altText) {
    return { alt: '', width: null, height: null };
  }

  // Check for pipe separator
  const pipeIndex = altText.lastIndexOf('|');
  if (pipeIndex === -1) {
    return { alt: altText, width: null, height: null };
  }

  const alt = altText.substring(0, pipeIndex);
  const dimensionPart = altText.substring(pipeIndex + 1);

  // Try to parse dimensions: "300" or "300x200"
  const dimensionMatch = dimensionPart.match(/^(\d+)(?:x(\d+))?$/);
  if (!dimensionMatch) {
    // Not valid dimensions, treat entire string as alt
    return { alt: altText, width: null, height: null };
  }

  const width = parseInt(dimensionMatch[1], 10);
  const height = dimensionMatch[2] ? parseInt(dimensionMatch[2], 10) : null;

  return { alt, width, height };
}

/**
 * Format alt text with dimensions for markdown output
 */
function formatAltWithDimensions(
  alt: string,
  width: number | null,
  height: number | null
): string {
  if (!width && !height) {
    return alt;
  }

  const dimensionStr = height ? `${width}x${height}` : `${width}`;
  return alt ? `${alt}|${dimensionStr}` : `|${dimensionStr}`;
}

/**
 * Check if a URL can be rendered directly (no conversion needed)
 * This includes:
 * - http/https URLs
 * - data: URLs
 * - VS Code webview resource URLs
 * - Absolute paths (starting with /) - works in browser/test environments
 */
function isRenderableUrl(url: string): boolean {
  return (
    url.startsWith('http') ||
    url.startsWith('data:') ||
    url.includes('vscode-resource') ||
    url.startsWith('/')
  );
}

/**
 * Request URL conversion from the VS Code extension
 */
function requestUrlConversion(relativePath: string): void {
  if (window.vscode && relativePath && !isRenderableUrl(relativePath)) {
    window.vscode.postMessage({ type: 'requestImageUrl', payload: { path: relativePath } });
  }
}

interface ImageNodeViewProps extends NodeViewProps {
  node: ProseMirrorNode;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  deleteNode: () => void;
  selected: boolean;
  getPos: () => number;
}

export function ImageNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: ImageNodeViewProps) {
  // State
  const [isEditing, setIsEditing] = useState(false);

  // Refs
  const editFieldRef = useRef<HTMLSpanElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const undoStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const lastSavedContentRef = useRef<string>('');
  const pendingPathRef = useRef<string>('');
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extract attributes from node
  const { src, originalSrc, alt, title, width, height } = node.attrs;

  // Display the user-friendly path (originalSrc) in edit mode, fall back to src
  const displaySrc = originalSrc || src || '';

  /**
   * Generate markdown syntax from current attributes
   */
  const getMarkdown = useCallback((): string => {
    const altWithDimensions = formatAltWithDimensions(alt || '', width, height);
    return `![${altWithDimensions}](${displaySrc})`;
  }, [alt, width, height, displaySrc]);

  /**
   * Update the edit field content to match current node attributes
   */
  const updateEditField = useCallback(() => {
    if (editFieldRef.current) {
      editFieldRef.current.textContent = getMarkdown();
    }
  }, [getMarkdown]);

  /**
   * Save current state to undo stack
   */
  const saveUndoState = useCallback(() => {
    const current = editFieldRef.current?.textContent || '';
    if (current !== lastSavedContentRef.current) {
      undoStackRef.current.push(lastSavedContentRef.current);
      redoStackRef.current = []; // Clear redo stack on new change
      lastSavedContentRef.current = current;
    }
  }, []);

  /**
   * Move cursor to end of edit field
   */
  const moveCursorToEnd = useCallback(() => {
    const sel = window.getSelection();
    if (sel && editFieldRef.current) {
      const range = document.createRange();
      range.selectNodeContents(editFieldRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, []);

  /**
   * Undo last change in edit field
   */
  const undo = useCallback(() => {
    if (undoStackRef.current.length > 0) {
      const current = editFieldRef.current?.textContent || '';
      redoStackRef.current.push(current);
      const prev = undoStackRef.current.pop()!;
      if (editFieldRef.current) {
        editFieldRef.current.textContent = prev;
      }
      lastSavedContentRef.current = prev;
      moveCursorToEnd();
    }
  }, [moveCursorToEnd]);

  /**
   * Redo last undone change in edit field
   */
  const redo = useCallback(() => {
    if (redoStackRef.current.length > 0) {
      const current = editFieldRef.current?.textContent || '';
      undoStackRef.current.push(current);
      const next = redoStackRef.current.pop()!;
      if (editFieldRef.current) {
        editFieldRef.current.textContent = next;
      }
      lastSavedContentRef.current = next;
      moveCursorToEnd();
    }
  }, [moveCursorToEnd]);

  /**
   * Enter edit mode - show markdown syntax for editing
   */
  const enterEditMode = useCallback(() => {
    if (isEditing) return;
    setIsEditing(true);

    // Initialize undo stack with current state
    const markdown = getMarkdown();
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastSavedContentRef.current = markdown;
  }, [isEditing, getMarkdown]);

  /**
   * Exit edit mode - parse markdown and update node attributes
   */
  const exitEditMode = useCallback(() => {
    if (!isEditing) return;
    setIsEditing(false);

    // Parse the markdown and update the node
    const text = (editFieldRef.current?.textContent || '').trim();

    // Match image markdown: ![alt](url) - alt may contain |dimensions
    const match = text.match(/^!\[([^\]]*)\]\(([^)]*)\)$/);

    const pos = getPos();

    if (match) {
      const [, rawAlt, newSrc] = match;
      const { alt: parsedAlt, width: parsedWidth, height: parsedHeight } = parseAltWithDimensions(rawAlt);

      // If the parsed result is an empty image (no src), delete the node
      if (!newSrc) {
        deleteNode();
        return;
      }

      // Compare against originalSrc (what user sees) not src (webview URL)
      const currentDisplaySrc = originalSrc || src || '';

      // Check if anything changed
      const altChanged = parsedAlt !== (alt || '');
      const srcChanged = newSrc !== currentDisplaySrc;
      const widthChanged = parsedWidth !== width;
      const heightChanged = parsedHeight !== height;

      if (altChanged || srcChanged || widthChanged || heightChanged) {
        // Build new attributes
        const newAttrs: Record<string, unknown> = {
          alt: parsedAlt || null,
          width: parsedWidth,
          height: parsedHeight,
        };

        if (srcChanged) {
          // User changed the path - update originalSrc
          newAttrs.originalSrc = newSrc || null;

          if (newSrc && isRenderableUrl(newSrc)) {
            // For http/https/data URLs, set src directly
            newAttrs.src = newSrc;
          } else if (newSrc) {
            // For relative paths, request URL conversion
            pendingPathRef.current = newSrc;
            requestUrlConversion(newSrc);
          }
        }

        updateAttributes(newAttrs);
      }
    } else if (text === '') {
      // Empty content - delete the node
      deleteNode();
    }
    // If text doesn't match pattern, the edit field will revert to original on next update
  }, [isEditing, getPos, originalSrc, src, alt, width, height, updateAttributes, deleteNode]);

  /**
   * Handle keyboard events in edit field
   */
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLSpanElement>) => {
    const modifier = e.metaKey || e.ctrlKey;

    // Handle Cmd+V / Ctrl+V for paste via VS Code API
    if (modifier && e.key === 'v') {
      e.preventDefault();
      e.stopPropagation();

      // Request clipboard from VS Code extension
      if (window.vscode && editFieldRef.current) {
        window.__pendingPasteTarget = editFieldRef.current;
        window.vscode.postMessage({ type: 'requestClipboard' });
      }
      return;
    }

    // Cmd+Z / Ctrl+Z for undo (without shift)
    if (modifier && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      undo();
      return;
    }

    // Cmd+Shift+Z / Ctrl+Y for redo
    if (modifier && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
      e.preventDefault();
      e.stopPropagation();
      redo();
      return;
    }

    // Allow Cmd+A / Ctrl+A for select all
    if (modifier && e.key === 'a') {
      e.stopPropagation();
      return;
    }

    // Handle Cmd+C / Ctrl+C for copy via VS Code API
    if (modifier && e.key === 'c') {
      e.preventDefault();
      e.stopPropagation();

      const sel = window.getSelection();
      if (sel && sel.toString()) {
        const textToCopy = sel.toString();
        if (window.vscode) {
          window.vscode.postMessage({ type: 'copyToClipboard', payload: { text: textToCopy } });
        }
      }
      return;
    }

    // Allow Cmd+X / Ctrl+X for cut
    if (modifier && e.key === 'x') {
      e.stopPropagation();
      // Let the browser handle cut
      return;
    }

    // Escape or Enter exits edit mode
    if (e.key === 'Escape' || e.key === 'Enter') {
      e.preventDefault();
      exitEditMode();
      editor.commands.focus();
      return;
    }

    // Arrow keys: navigate within the field
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.stopPropagation();

      const sel = window.getSelection();
      if (!sel) return;

      // Shift+Arrow for selection - let browser handle
      if (e.shiftKey) {
        return;
      }

      // Up arrow: move to start
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const range = document.createRange();
        range.setStart(editFieldRef.current!, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // Down arrow: move to end
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const range = document.createRange();
        range.selectNodeContents(editFieldRef.current!);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }

      // Left/Right: let browser handle naturally
      return;
    }

    // Delete the image if user clears all text and presses backspace/delete
    const text = editFieldRef.current?.textContent || '';
    const isEmpty = text === '' || text.trim() === '';

    if ((e.key === 'Backspace' || e.key === 'Delete') && isEmpty) {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(false);
      deleteNode();
      return;
    }

    // Allow normal editing keys - stop propagation to prevent editor from handling
    e.stopPropagation();
  }, [undo, redo, exitEditMode, editor, deleteNode]);

  /**
   * Handle input in edit field - save undo state with debounce
   */
  const handleInput = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(saveUndoState, 300);
  }, [saveUndoState]);

  /**
   * Stop event propagation for keyup/keypress
   */
  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  /**
   * Handle image click - enter edit mode
   */
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    editor.commands.setNodeSelection(getPos());
    enterEditMode();
  }, [editor, getPos, enterEditMode]);

  /**
   * Handle blur on edit field - exit edit mode
   */
  const handleBlur = useCallback(() => {
    exitEditMode();
  }, [exitEditMode]);

  // Effect: Focus edit field and set cursor position when entering edit mode
  useEffect(() => {
    if (isEditing && editFieldRef.current) {
      const field = editFieldRef.current;
      field.focus();

      const text = field.textContent || '';
      const sel = window.getSelection();
      const range = document.createRange();

      // If empty image (no alt, no src), position cursor in alt text area (between [ and ])
      if (text === '![]()') {
        const textNode = field.firstChild;
        if (textNode && sel) {
          // Position cursor after "![" (at position 2)
          range.setStart(textNode, 2);
          range.setEnd(textNode, 2);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        // Select all for non-empty images
        range.selectNodeContents(field);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }, [isEditing]);

  // Effect: Handle URL resolution from extension
  useEffect(() => {
    const handleUrlResolved = (event: Event) => {
      const customEvent = event as CustomEvent<{ originalPath: string; webviewUrl: string }>;
      const { originalPath, webviewUrl } = customEvent.detail;

      // Check if this is the path we're waiting for
      if (pendingPathRef.current && originalPath === pendingPathRef.current) {
        pendingPathRef.current = '';

        // Update the node attributes with the resolved URL
        // Using setMeta to avoid adding to undo history
        const pos = getPos();
        editor.view.dispatch(
          editor.state.tr
            .setMeta('addToHistory', false)
            .setNodeMarkup(pos, undefined, {
              ...node.attrs,
              src: webviewUrl,
              originalSrc: originalPath,
            })
        );
      }
    };

    window.addEventListener('image-url-resolved', handleUrlResolved);
    return () => {
      window.removeEventListener('image-url-resolved', handleUrlResolved);
    };
  }, [editor, getPos, node.attrs]);

  // Effect: Request URL conversion for initial relative paths
  useEffect(() => {
    if (!isRenderableUrl(src) && src && !pendingPathRef.current) {
      pendingPathRef.current = src;
      requestUrlConversion(src);
    }
  }, [src]);

  // Effect: Exit edit mode when node is deselected
  // Note: We only exit edit mode when deselected. Entering edit mode is handled
  // explicitly by handleImageClick to avoid entering edit mode during document load.
  useEffect(() => {
    if (!selected && isEditing) {
      exitEditMode();
    }
  }, [selected, isEditing, exitEditMode]);

  // Effect: Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Determine image src for display
  const imageSrc = isRenderableUrl(src) ? src : '';

  return (
    <NodeViewWrapper
      className={`image-node-view ${isEditing ? 'is-editing' : ''} ${selected ? 'is-selected' : ''}`}
      as="span"
    >
      {/* Edit field - shown when editing */}
      <span
        ref={editFieldRef}
        className="image-markdown-edit"
        contentEditable={isEditing}
        suppressContentEditableWarning
        spellCheck={false}
        onKeyDown={handleKeyDown}
        onKeyUp={stopPropagation}
        onKeyPress={stopPropagation}
        onInput={handleInput}
        onBlur={handleBlur}
        style={{ display: isEditing ? 'inline-block' : 'none' }}
      >
        {getMarkdown()}
      </span>

      {/* Image display - shown when not editing */}
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt || ''}
        title={title || undefined}
        width={width || undefined}
        height={height || undefined}
        className="editor-image"
        onClick={handleImageClick}
        draggable={false}
        style={{ display: isEditing ? 'none' : 'inline' }}
      />
    </NodeViewWrapper>
  );
}

/**
 * Default export for use with ReactNodeViewRenderer
 *
 * Usage in ImageNode.ts:
 *   import { ReactNodeViewRenderer } from '@tiptap/react'
 *   import { ImageNodeView } from './ImageNodeView'
 *
 *   addNodeView() {
 *     return ReactNodeViewRenderer(ImageNodeView)
 *   }
 */
export default ImageNodeView;
