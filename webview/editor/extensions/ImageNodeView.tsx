/**
 * ImageNodeView - React NodeView for Tiptap Image extension
 *
 * Three visual states:
 * 1. Drop Zone — when src is empty (from slash command insertion)
 * 2. Image Display — rendered image, clickable to select
 * 3. Image Selected — shows resize handles + popover toolbar
 *
 * Resize logic forked from tiptap-extension-resize-image,
 * adapted from vanilla DOM to React hook pattern.
 */

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { ImageDropZone } from '../components/ImageDropZone';
import { ImagePopoverToolbar } from '../components/ImagePopoverToolbar';
import { useImageResize } from '../hooks/useImageResize';

// VS Code API type declaration
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

/**
 * Check if a URL can be rendered directly
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
  const { src, originalSrc, alt, title, width, textAlign } = node.attrs;

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingPathRef = useRef<string>('');
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);

  // Resize hook
  const { handleMouseDown, handleTouchStart } = useImageResize({
    containerRef,
    minWidth: 50,
    onResizeStart: () => setIsResizing(true),
    onResize: (w) => {
      // Live preview — update DOM style directly without ProseMirror transaction
      setLiveWidth(w);
    },
    onResizeEnd: (w) => {
      setIsResizing(false);
      setLiveWidth(null);
      updateAttributes({ width: w });
    },
  });

  // Handle URL resolution from extension
  useEffect(() => {
    const handleUrlResolved = (event: Event) => {
      const customEvent = event as CustomEvent<{ originalPath: string; webviewUrl: string }>;
      const { originalPath, webviewUrl } = customEvent.detail;

      if (pendingPathRef.current && originalPath === pendingPathRef.current) {
        pendingPathRef.current = '';
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

  // Handle image saved (file upload response)
  useEffect(() => {
    const handleImageSaved = (event: Event) => {
      const customEvent = event as CustomEvent<{ originalPath: string; webviewUrl: string }>;
      const { originalPath, webviewUrl } = customEvent.detail;
      console.log('[ImageNodeView] image-saved event received, src:', src, 'originalPath:', originalPath);

      // Only accept if this node currently has no src (is showing drop zone)
      if (!src) {
        updateAttributes({ src: webviewUrl, originalSrc: originalPath });
      }
    };

    window.addEventListener('image-saved', handleImageSaved);
    return () => {
      window.removeEventListener('image-saved', handleImageSaved);
    };
  }, [src, updateAttributes]);

  // Handle file picker result
  useEffect(() => {
    const handleFilePickerResult = (event: Event) => {
      const customEvent = event as CustomEvent<{ originalPath: string; webviewUrl: string }>;
      const { originalPath, webviewUrl } = customEvent.detail;
      console.log('[ImageNodeView] file-picker-result event received, src:', src, 'originalPath:', originalPath, 'webviewUrl:', webviewUrl);

      if (!src) {
        updateAttributes({ src: webviewUrl, originalSrc: originalPath });
      }
    };

    window.addEventListener('file-picker-result', handleFilePickerResult);
    return () => {
      window.removeEventListener('file-picker-result', handleFilePickerResult);
    };
  }, [src, updateAttributes]);

  // Request URL conversion for relative paths on mount
  useEffect(() => {
    if (src && !isRenderableUrl(src) && !pendingPathRef.current) {
      pendingPathRef.current = src;
      requestUrlConversion(src);
    }
  }, [src]);

  // Handle image click — select the node
  const handleImageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    editor.commands.setNodeSelection(getPos());
  }, [editor, getPos]);

  // Drop zone handlers
  const handleUrlSubmit = useCallback((url: string) => {
    console.log('[ImageNodeView] handleUrlSubmit called with:', url);
    if (isRenderableUrl(url)) {
      console.log('[ImageNodeView] URL is renderable, setting src directly');
      updateAttributes({ src: url, originalSrc: url });
    } else {
      console.log('[ImageNodeView] URL is relative, requesting conversion');
      updateAttributes({ originalSrc: url });
      pendingPathRef.current = url;
      requestUrlConversion(url);
    }
  }, [updateAttributes]);

  const handleFileDrop = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      window.vscode?.postMessage({
        type: 'saveImage',
        payload: { filename: file.name, data: reader.result },
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handleBrowseClick = useCallback(() => {
    console.log('[ImageNodeView] handleBrowseClick called, vscode:', !!window.vscode);
    window.vscode?.postMessage({ type: 'requestFilePicker' });
  }, []);

  // Popover toolbar handlers
  const handleAlignChange = useCallback((align: 'left' | 'center' | 'right') => {
    updateAttributes({ textAlign: align === 'left' ? null : align });
  }, [updateAttributes]);

  const handleReplace = useCallback(() => {
    updateAttributes({ src: '', originalSrc: '' });
  }, [updateAttributes]);

  // Drop Zone state — src is empty
  if (!src) {
    return (
      <NodeViewWrapper className="image-node-view" data-text-align={textAlign || undefined}>
        <ImageDropZone
          onUrlSubmit={handleUrlSubmit}
          onFileDrop={handleFileDrop}
          onBrowseClick={handleBrowseClick}
        />
      </NodeViewWrapper>
    );
  }

  const imageSrc = isRenderableUrl(src) ? src : '';
  const displayWidth = liveWidth ?? width;

  return (
    <NodeViewWrapper
      className={`image-node-view ${selected ? 'is-selected' : ''}`}
      data-text-align={textAlign || undefined}
    >
      <div
        ref={containerRef}
        className="image-container"
        style={{ width: displayWidth ? `${displayWidth}px` : undefined }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt || ''}
          title={title || undefined}
          className="editor-image"
          onClick={handleImageClick}
          draggable={false}
          style={{ width: displayWidth ? '100%' : undefined }}
          onError={(e) => console.error('[ImageNodeView] Image load error, src:', (e.target as HTMLImageElement).src)}
        />

        {/* Popover toolbar — shown when selected and not resizing */}
        {selected && !isResizing && (
          <ImagePopoverToolbar
            textAlign={textAlign}
            onAlignChange={handleAlignChange}
            onReplace={handleReplace}
            onDelete={deleteNode}
          />
        )}

        {/* Resize handles — shown when selected */}
        {selected && (
          <>
            <div
              className="image-resize-handle image-resize-nw"
              onMouseDown={(e) => handleMouseDown(e, 'nw')}
              onTouchStart={(e) => handleTouchStart(e, 'nw')}
            />
            <div
              className="image-resize-handle image-resize-ne"
              onMouseDown={(e) => handleMouseDown(e, 'ne')}
              onTouchStart={(e) => handleTouchStart(e, 'ne')}
            />
            <div
              className="image-resize-handle image-resize-sw"
              onMouseDown={(e) => handleMouseDown(e, 'sw')}
              onTouchStart={(e) => handleTouchStart(e, 'sw')}
            />
            <div
              className="image-resize-handle image-resize-se"
              onMouseDown={(e) => handleMouseDown(e, 'se')}
              onTouchStart={(e) => handleTouchStart(e, 'se')}
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

export default ImageNodeView;
