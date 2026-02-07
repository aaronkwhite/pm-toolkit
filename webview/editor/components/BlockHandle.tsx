/**
 * BlockHandle React Component
 *
 * Shows drag handle and plus button on the left side of each block element.
 * - Plus button (+): Inserts a new paragraph and triggers the slash command menu
 * - Drag handle (six dots): Allows drag-and-drop reordering of blocks
 *
 * Drag uses pointer events (not HTML5 drag-and-drop) because the handle lives
 * outside ProseMirror's DOM, and VS Code webviews don't reliably deliver
 * dragover/drop events from external elements into contenteditable.
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

/** List containers that should be treated as a single block */
const LIST_SELECTORS = 'ul, ol';

/**
 * If the element is nested inside a list, return the outermost list
 * that is still a direct child of the editor. This treats the entire
 * list (including nested lists) as one block.
 */
function toTopLevelBlock(el: Element, editorEl: Element): Element {
  let current: Element | null = el;
  let topList: Element | null = null;
  while (current && current !== editorEl) {
    if (current.matches(LIST_SELECTORS)) {
      topList = current;
    }
    current = current.parentElement;
  }
  return topList ?? el;
}

/**
 * For elements inside a React NodeView, return the NodeView wrapper element
 * which ProseMirror can resolve positions for. Otherwise return the element itself.
 */
function toProseMirrorNode(el: Element): Element {
  const wrapper = el.closest('[data-node-view-wrapper]');
  return wrapper ?? el;
}

/**
 * Find the top-level block element under a y-coordinate within the editor.
 * Handles both native ProseMirror elements and React NodeView wrappers.
 */
function blockAtY(editorEl: Element, y: number): Element | null {
  // Direct children matching block selectors
  const scopedSelectors = BLOCK_SELECTORS.split(', ').map(s => `:scope > ${s}`).join(', ');
  // Also check inside NodeView wrappers (React NodeViews wrap content in [data-node-view-wrapper])
  const nodeViewSelectors = BLOCK_SELECTORS.split(', ').map(s => `:scope > [data-node-view-wrapper] > ${s}`).join(', ');
  const rawBlocks = editorEl.querySelectorAll(`${scopedSelectors}, ${nodeViewSelectors}`);

  // Deduplicate: lift nested list items to their top-level list
  const seen = new Set<Element>();
  const blocks: Element[] = [];
  for (const block of rawBlocks) {
    const top = toTopLevelBlock(block, editorEl);
    if (!seen.has(top)) {
      seen.add(top);
      blocks.push(top);
    }
  }

  let closest: Element | null = null;
  let closestDist = Infinity;
  for (const block of blocks) {
    const rect = block.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const dist = Math.abs(y - mid);
    if (dist < closestDist) {
      closestDist = dist;
      closest = block;
    }
  }
  return closest;
}

export function BlockHandle({ editor }: BlockHandleProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [activeNode, setActiveNode] = useState<Element | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  // Toggle block-hover class on the active block element
  useEffect(() => {
    if (activeNode instanceof HTMLElement) {
      activeNode.classList.add('block-hover');
    }
    return () => {
      if (activeNode instanceof HTMLElement) {
        activeNode.classList.remove('block-hover');
      }
    };
  }, [activeNode]);

  // Drag state refs (not React state — needs to be synchronous in event handlers)
  const dragStateRef = useRef<{
    sourceBlockEl: Element;
    sourcePos: number;
    sourceSize: number;
    indicatorEl: HTMLDivElement;
  } | null>(null);

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
   * This prevents flickering when moving between blocks or toward the handles
   */
  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = window.setTimeout(() => {
      setPosition(null);
      setActiveNode(null);
    }, 200);
  }, [clearHideTimeout]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Don't reposition handles while dragging
      if (dragStateRef.current) return;

      const editorEl = document.querySelector('.ProseMirror');
      const wrapperEl = document.getElementById('editor-wrapper');
      if (!editorEl || !wrapperEl) return;

      // Get the element under the cursor
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target) {
        scheduleHide();
        return;
      }

      // If hovering over the handle itself, don't reposition — just keep it visible
      if (containerRef.current?.contains(target)) {
        clearHideTimeout();
        return;
      }

      // Find the closest block-level node, then lift to the top-level list if nested
      const rawBlock = target.closest(BLOCK_SELECTORS);
      if (!rawBlock || !editorEl.contains(rawBlock)) {
        scheduleHide();
        return;
      }
      const blockNode = toTopLevelBlock(rawBlock, editorEl);

      // Cancel any pending hide since we found a valid block
      clearHideTimeout();

      // Position handles to the left of the block, relative to #editor-wrapper
      const blockRect = blockNode.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      const handleWidth = 38; // 18px + 2px gap + 18px
      const handleGap = 6; // space between handles and content

      setPosition({
        top: blockRect.top - wrapperRect.top + wrapperEl.scrollTop,
        left: blockRect.left - wrapperRect.left - handleWidth - handleGap,
      });
      setActiveNode(blockNode);
    };

    const handleMouseLeave = () => {
      if (!dragStateRef.current) {
        scheduleHide();
      }
    };

    // Attach to #editor-wrapper so handles (in the padding zone) are included
    const wrapperEl = document.getElementById('editor-wrapper');
    if (wrapperEl) {
      wrapperEl.addEventListener('mousemove', handleMouseMove);
      wrapperEl.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      clearHideTimeout();
      if (wrapperEl) {
        wrapperEl.removeEventListener('mousemove', handleMouseMove);
        wrapperEl.removeEventListener('mouseleave', handleMouseLeave);
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

      // Resolve to the top-level block (depth 1) so that lists, blockquotes
      // etc. insert the new paragraph *after* the entire container, not inside it.
      const $pos = editor.state.doc.resolve(pos);
      const topDepth = Math.min($pos.depth, 1);
      const after = $pos.after(topDepth);

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
   * Pointer-based drag: mousedown starts, mousemove shows indicator, mouseup moves block.
   */
  const handleGripMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!activeNode) return;
      e.preventDefault(); // Prevent text selection

      const view = editor.view;
      const editorEl = document.querySelector('.ProseMirror');
      if (!editorEl) return;

      try {
        const pmNode = toProseMirrorNode(activeNode);
        const pos = view.posAtDOM(pmNode, 0);
        const $pos = view.state.doc.resolve(pos);

        // For top-level nodes (depth 1) use $pos.before(), but for
        // atom/leaf nodes where posAtDOM resolves to depth 0 (the doc),
        // the node sits directly at `pos` in the doc.
        let blockPos: number;
        if ($pos.depth === 0) {
          // posAtDOM landed at doc level — find the child node at this offset
          blockPos = pos;
          // Walk back to find the actual node start if pos is inside the node
          const node = view.state.doc.nodeAt(pos);
          if (!node) {
            // pos might be just past the node; try pos-1
            const prevNode = view.state.doc.nodeAt(pos - 1);
            if (prevNode) {
              blockPos = pos - 1;
            }
          }
        } else {
          blockPos = $pos.before($pos.depth);
        }

        const node = view.state.doc.nodeAt(blockPos);
        if (!node) return;

        // Create drop indicator line
        const indicator = document.createElement('div');
        indicator.className = 'block-drop-indicator';
        document.body.appendChild(indicator);

        // Visual feedback on source
        if (activeNode instanceof HTMLElement) {
          activeNode.classList.add('is-dragging');
        }

        dragStateRef.current = {
          sourceBlockEl: activeNode,
          sourcePos: blockPos,
          sourceSize: node.nodeSize,
          indicatorEl: indicator,
        };

        // Hide the handle buttons during drag
        setPosition(null);

        const onMouseMove = (moveEvent: MouseEvent) => {
          const drag = dragStateRef.current;
          if (!drag) return;

          // Find the block under the cursor
          const targetBlock = blockAtY(editorEl, moveEvent.clientY);
          if (!targetBlock || targetBlock === drag.sourceBlockEl) {
            drag.indicatorEl.style.display = 'none';
            return;
          }

          // Position the indicator above or below the target block
          const targetRect = targetBlock.getBoundingClientRect();
          const midY = targetRect.top + targetRect.height / 2;
          const above = moveEvent.clientY < midY;

          drag.indicatorEl.style.display = 'block';
          drag.indicatorEl.style.top = `${above ? targetRect.top : targetRect.bottom}px`;
          drag.indicatorEl.style.left = `${targetRect.left}px`;
          drag.indicatorEl.style.width = `${targetRect.width}px`;

          // Store target info on the indicator for mouseup
          (drag.indicatorEl as any)._dropTarget = { element: targetBlock, above };
        };

        const onMouseUp = (upEvent: MouseEvent) => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);

          const drag = dragStateRef.current;
          if (!drag) return;

          // Clean up visual state
          if (drag.sourceBlockEl instanceof HTMLElement) {
            drag.sourceBlockEl.classList.remove('is-dragging');
          }
          drag.indicatorEl.remove();

          const dropInfo = (drag.indicatorEl as any)._dropTarget as
            | { element: Element; above: boolean }
            | undefined;

          dragStateRef.current = null;

          if (!dropInfo) return;

          // Resolve drop target position and move the block
          try {
            const targetPos = view.posAtDOM(toProseMirrorNode(dropInfo.element), 0);
            const $target = view.state.doc.resolve(targetPos);

            let insertPos: number;
            if ($target.depth === 0) {
              // Atom/leaf node at doc level — find the node at this position
              const targetNode = view.state.doc.nodeAt(targetPos);
              if (targetNode) {
                insertPos = dropInfo.above ? targetPos : targetPos + targetNode.nodeSize;
              } else {
                // Try pos-1
                const prevNode = view.state.doc.nodeAt(targetPos - 1);
                if (prevNode) {
                  insertPos = dropInfo.above ? targetPos - 1 : targetPos - 1 + prevNode.nodeSize;
                } else {
                  return;
                }
              }
            } else {
              insertPos = dropInfo.above ? $target.before($target.depth) : $target.after($target.depth);
            }

            const { sourcePos, sourceSize } = drag;
            const sourceEnd = sourcePos + sourceSize;

            // Don't move to the same position
            if (insertPos === sourcePos || insertPos === sourceEnd) return;

            const tr = view.state.tr;
            const blockSlice = view.state.doc.slice(sourcePos, sourceEnd);

            let movedBlockPos: number;
            if (insertPos > sourcePos) {
              // Moving down: delete source first, then insert at adjusted position
              tr.delete(sourcePos, sourceEnd);
              const adjusted = insertPos - sourceSize;
              tr.insert(adjusted, blockSlice.content);
              movedBlockPos = adjusted;
            } else {
              // Moving up: insert first, then delete source at shifted position
              tr.insert(insertPos, blockSlice.content);
              tr.delete(sourcePos + sourceSize, sourceEnd + sourceSize);
              movedBlockPos = insertPos;
            }

            // Preserve whatever selection existed before the move (don't flash cursor)
            // by not calling setSelection or focus
            view.dispatch(tr);

            // After the DOM updates, show handles on the moved block
            requestAnimationFrame(() => {
              const editorEl = document.querySelector('.ProseMirror');
              const wrapperEl = document.getElementById('editor-wrapper');
              if (!editorEl || !wrapperEl) return;

              // Find the DOM node for the moved block
              try {
                const domAtPos = view.domAtPos(movedBlockPos + 1);
                const movedEl = domAtPos.node instanceof Element
                  ? domAtPos.node.closest(BLOCK_SELECTORS) || domAtPos.node
                  : domAtPos.node.parentElement?.closest(BLOCK_SELECTORS);
                if (!movedEl) return;

                const blockRect = movedEl.getBoundingClientRect();
                const wrapperRect = wrapperEl.getBoundingClientRect();
                const handleWidth = 44; // 38px handles + 6px gap

                setPosition({
                  top: blockRect.top - wrapperRect.top + wrapperEl.scrollTop,
                  left: blockRect.left - wrapperRect.left - handleWidth,
                });
                setActiveNode(movedEl);
              } catch { /* block may have been merged/changed */ }
            });
          } catch (err) {
            console.warn('BlockHandle: move failed', err);
          }
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      } catch (error) {
        console.warn('BlockHandle: Could not initiate drag', error);
      }
    },
    [editor, activeNode]
  );

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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        className="block-handle-drag"
        onMouseDown={handleGripMouseDown}
        title="Drag to move"
        type="button"
        aria-label="Drag to reorder"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="1.5" r="1" />
          <circle cx="6" cy="1.5" r="1" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="6" cy="6" r="1" />
          <circle cx="2" cy="10.5" r="1" />
          <circle cx="6" cy="10.5" r="1" />
        </svg>
      </button>
    </div>
  );
}

BlockHandle.displayName = 'BlockHandle';
