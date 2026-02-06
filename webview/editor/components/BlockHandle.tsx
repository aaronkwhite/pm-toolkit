/**
 * BlockHandle React Component
 *
 * Shows drag handle and plus button on the left side of each block element.
 * - Plus button (+): Inserts a new paragraph and triggers the slash command menu
 * - Drag handle (six dots): Allows drag-and-drop reordering of blocks
 *
 * CRITICAL: CSS selectors must be preserved for E2E tests:
 * - .block-handle-container
 * - .block-handle-plus
 * - .block-handle-drag
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Editor } from '@tiptap/core';

interface BlockHandleProps {
  editor: Editor;
}

/** Block-level selectors for elements that can have handles */
const BLOCK_SELECTORS = [
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'blockquote',
  'pre',
  '.image-node-view',
  '.mermaid-node',
].join(', ');

export function BlockHandle({ editor }: BlockHandleProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeNode, setActiveNode] = useState<Element | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  /**
   * Clear any pending hide timeout
   */
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  /**
   * Schedule hiding the handles with a small delay
   * This prevents flickering when moving between blocks
   */
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setPosition(null);
      setActiveNode(null);
    }, 100);
  }, [clearHideTimeout]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Find the ProseMirror editor element
      const editorEl = document.querySelector('.ProseMirror');
      if (!editorEl) return;

      // Get the element under the cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) {
        scheduleHide();
        return;
      }

      // Find the closest block-level node
      const blockNode = target.closest(BLOCK_SELECTORS);
      if (!blockNode || !editorEl.contains(blockNode)) {
        scheduleHide();
        return;
      }

      // Cancel any pending hide since we found a valid block
      clearHideTimeout();

      // Get bounding rectangles for positioning
      const blockRect = blockNode.getBoundingClientRect();
      const editorRect = editorEl.getBoundingClientRect();

      // Position handles to the left of the block
      // Account for editor padding and scroll position
      setPosition({
        top: blockRect.top - editorRect.top + editorEl.scrollTop,
        left: -44, // Position to the left of the editor content
      });
      setActiveNode(blockNode);
    };

    const handleMouseLeave = () => {
      scheduleHide();
    };

    // Attach event listeners to the editor
    const editorEl = document.querySelector('.ProseMirror');
    if (editorEl) {
      editorEl.addEventListener('mousemove', handleMouseMove);
      editorEl.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearHideTimeout();
      if (editorEl) {
        editorEl.removeEventListener('mousemove', handleMouseMove);
        editorEl.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [clearHideTimeout, scheduleHide]);

  /**
   * Handle click on the plus button
   * Inserts a new paragraph after the current block and triggers slash menu
   */
  const handlePlusClick = useCallback(() => {
    if (!activeNode) return;

    try {
      // Get the ProseMirror position for the DOM node
      const pos = editor.view.posAtDOM(activeNode, 0);

      // Find the end of the current block
      const $pos = editor.state.doc.resolve(pos);
      const after = $pos.after();

      // Insert an empty paragraph after the current block
      editor
        .chain()
        .focus()
        .insertContentAt(after, { type: 'paragraph' })
        .setTextSelection(after + 1)
        .run();

      // Trigger the slash menu by inserting "/"
      // Small delay ensures the cursor is positioned correctly
      setTimeout(() => {
        editor.commands.insertContent('/');
      }, 10);
    } catch (error) {
      // If position lookup fails, fall back to inserting at cursor
      console.warn('BlockHandle: Could not determine block position, using cursor position');
      editor.chain().focus().insertContent('\n/').run();
    }
  }, [editor, activeNode]);

  /**
   * Handle drag start on the drag handle
   * Sets up data transfer for block dragging
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (!activeNode) {
        e.preventDefault();
        return;
      }

      try {
        // Get the ProseMirror position for the DOM node
        const pos = editor.view.posAtDOM(activeNode, 0);
        const $pos = editor.state.doc.resolve(pos);

        // Get the node at this position
        const node = $pos.parent.maybeChild($pos.index());
        if (!node) {
          e.preventDefault();
          return;
        }

        // Set up the data transfer with node information
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
        e.dataTransfer.setData(
          'application/pm-block',
          JSON.stringify({
            pos: $pos.before(),
            size: node.nodeSize,
          })
        );

        // Add visual feedback
        if (activeNode instanceof HTMLElement) {
          activeNode.classList.add('is-dragging');
        }
      } catch (error) {
        console.warn('BlockHandle: Could not initiate drag');
        e.preventDefault();
      }
    },
    [editor, activeNode]
  );

  /**
   * Handle drag end - clean up visual state
   */
  const handleDragEnd = useCallback(() => {
    if (activeNode instanceof HTMLElement) {
      activeNode.classList.remove('is-dragging');
    }
  }, [activeNode]);

  // Don't render if no position (no block being hovered)
  if (!position) return null;

  return (
    <div
      ref={containerRef}
      className="block-handle-container"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
      // Prevent handle from triggering mouseleave on editor
      onMouseEnter={clearHideTimeout}
    >
      <button
        className="block-handle-plus"
        onClick={handlePlusClick}
        title="Add block below"
        type="button"
        aria-label="Add block below"
      >
        +
      </button>
      <button
        className="block-handle-drag"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title="Drag to move"
        type="button"
        aria-label="Drag to reorder"
      >
        &#10247;
      </button>
    </div>
  );
}

BlockHandle.displayName = 'BlockHandle';
