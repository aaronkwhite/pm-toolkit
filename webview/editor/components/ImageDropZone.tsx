/**
 * ImageDropZone Component
 *
 * Drop zone UI shown when an image node has no src.
 * Supports URL input and Browse button (VS Code native file picker).
 * Also accepts file drops from OS file manager (Finder, etc.).
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';

// VS Code API type
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void;
      getState: () => unknown;
      setState: (state: unknown) => void;
    };
  }
}

interface ImageDropZoneProps {
  onUrlSubmit: (url: string) => void;
  onFileDrop: (file: File) => void;
  onBrowseClick: () => void;
}

export function ImageDropZone({ onUrlSubmit, onFileDrop, onBrowseClick }: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileDrop(file);
        return;
      }
    }

    // Also check for text/uri-list (dragged from browser)
    const uri = e.dataTransfer.getData('text/uri-list');
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      onUrlSubmit(uri.trim());
    }
  }, [onFileDrop, onUrlSubmit]);

  const handleUrlKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    // Stop propagation so ProseMirror doesn't intercept
    e.stopPropagation();

    if (e.key === 'Enter' && urlValue.trim()) {
      e.preventDefault();
      onUrlSubmit(urlValue.trim());
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.blur();
    }

    // Handle Cmd/Ctrl+V — request clipboard from VS Code extension
    if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      window.vscode?.postMessage({ type: 'requestClipboard' });
    }
  }, [urlValue, onUrlSubmit]);

  // Listen for clipboard data from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'clipboardData' && event.data.payload?.text) {
        // Only paste if our input is focused
        if (document.activeElement === inputRef.current) {
          setUrlValue(prev => {
            const input = inputRef.current;
            if (!input) return prev + event.data.payload.text;
            // Insert at cursor position
            const start = input.selectionStart ?? prev.length;
            const end = input.selectionEnd ?? prev.length;
            return prev.slice(0, start) + event.data.payload.text + prev.slice(end);
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlValue(e.target.value);
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    // VS Code webviews don't support standard paste — handled via requestClipboard
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Prevent ProseMirror from stealing focus when clicking inside the drop zone
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`image-drop-zone ${isDragOver ? 'is-drag-over' : ''}`}
      contentEditable={false}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
    >
      <div className="image-drop-zone-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
          <line x1="12" y1="4" x2="12" y2="8" />
          <line x1="10" y1="6" x2="14" y2="6" />
        </svg>
      </div>
      <div className="image-drop-zone-text">
        Paste a URL or browse for an image
      </div>
      <div className="image-drop-zone-url-row">
        <input
          ref={inputRef}
          type="text"
          className="image-drop-zone-input"
          placeholder="https://example.com/image.png or ./path/to/image.png"
          value={urlValue}
          onChange={handleUrlChange}
          onKeyDown={handleUrlKeyDown}
          onPaste={handlePaste}
        />
        <button
          type="button"
          className="image-drop-zone-btn"
          onClick={onBrowseClick}
        >
          Browse
        </button>
      </div>
    </div>
  );
}
