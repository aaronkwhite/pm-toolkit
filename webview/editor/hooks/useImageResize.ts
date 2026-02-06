/**
 * useImageResize Hook
 *
 * React hook for image resize functionality.
 * Forked from tiptap-extension-resize-image's ResizeController,
 * adapted from vanilla DOM to React patterns.
 *
 * Handles mousedown/mousemove/mouseup on corner handles for width-only resize.
 * Touch events supported for mobile.
 */

import { useRef, useCallback } from 'react';

type Corner = 'nw' | 'ne' | 'sw' | 'se';

function clampWidth(width: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.max(0, width)));
}

interface UseImageResizeOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  minWidth?: number;
  maxWidth?: number;
  onResizeStart?: () => void;
  onResize: (width: number) => void;
  onResizeEnd: (width: number) => void;
}

interface ResizeState {
  isResizing: boolean;
  startX: number;
  startWidth: number;
  corner: Corner;
}

export function useImageResize({
  containerRef,
  minWidth = 50,
  maxWidth,
  onResizeStart,
  onResize,
  onResizeEnd,
}: UseImageResizeOptions) {
  const stateRef = useRef<ResizeState>({
    isResizing: false,
    startX: 0,
    startWidth: 0,
    corner: 'se',
  });

  const getMaxWidth = useCallback((): number => {
    if (maxWidth) return maxWidth;
    // Default to parent container width
    const parent = containerRef.current?.parentElement;
    if (parent) return parent.clientWidth;
    return 800;
  }, [maxWidth, containerRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent, corner: Corner) => {
    e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    stateRef.current = {
      isResizing: true,
      startX: e.clientX,
      startWidth: container.offsetWidth,
      corner,
    };

    onResizeStart?.();

    const max = getMaxWidth();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const state = stateRef.current;
      if (!state.isResizing) return;

      // Left-side corners invert the delta
      const isLeftSide = state.corner === 'nw' || state.corner === 'sw';
      const deltaX = isLeftSide
        ? -(moveEvent.clientX - state.startX)
        : moveEvent.clientX - state.startX;

      const newWidth = clampWidth(state.startWidth + deltaX, minWidth, max);
      onResize(newWidth);
    };

    const onMouseUp = () => {
      const state = stateRef.current;
      if (state.isResizing) {
        state.isResizing = false;

        // Get final width from the container
        const container = containerRef.current;
        if (container) {
          onResizeEnd(container.offsetWidth);
        }
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [containerRef, minWidth, getMaxWidth, onResizeStart, onResize, onResizeEnd]);

  const handleTouchStart = useCallback((e: React.TouchEvent, corner: Corner) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const container = containerRef.current;
    if (!container) return;

    stateRef.current = {
      isResizing: true,
      startX: e.touches[0].clientX,
      startWidth: container.offsetWidth,
      corner,
    };

    onResizeStart?.();

    const max = getMaxWidth();

    const onTouchMove = (moveEvent: TouchEvent) => {
      const state = stateRef.current;
      if (!state.isResizing) return;

      const isLeftSide = state.corner === 'nw' || state.corner === 'sw';
      const deltaX = isLeftSide
        ? -(moveEvent.touches[0].clientX - state.startX)
        : moveEvent.touches[0].clientX - state.startX;

      const newWidth = clampWidth(state.startWidth + deltaX, minWidth, max);
      onResize(newWidth);
    };

    const onTouchEnd = () => {
      const state = stateRef.current;
      if (state.isResizing) {
        state.isResizing = false;

        const container = containerRef.current;
        if (container) {
          onResizeEnd(container.offsetWidth);
        }
      }
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove);
    document.addEventListener('touchend', onTouchEnd);
  }, [containerRef, minWidth, getMaxWidth, onResizeStart, onResize, onResizeEnd]);

  return { handleMouseDown, handleTouchStart };
}
