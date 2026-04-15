import { useEffect, useState, useRef, useCallback } from 'react';
import type { Editor } from '@tiptap/core';
import { findReplaceKey } from '../extensions/FindReplace';
import type { FindReplaceState } from '../extensions/FindReplace';

interface FindReplaceBarProps {
  editor: Editor;
}

export function FindReplaceBar({ editor }: FindReplaceBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [findValue, setFindValue] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [pluginState, setPluginState] = useState<FindReplaceState | null>(null);

  const findInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to plugin state changes
  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      const state = findReplaceKey.getState(editor.state);
      if (state) {
        setPluginState({ ...state });
        if (state.isOpen !== isOpen) {
          setIsOpen(state.isOpen);
        }
        if (state.showReplace !== showReplace) {
          setShowReplace(state.showReplace);
        }
      }
    };

    editor.on('transaction', updateState);
    updateState();

    return () => {
      editor.off('transaction', updateState);
    };
  }, [editor]);

  // Listen for open-find / open-find-replace custom events
  useEffect(() => {
    const handleOpenFind = () => {
      setIsOpen(true);
      setShowReplace(false);
      editor.commands.openFind();
      setTimeout(() => findInputRef.current?.focus(), 50);
    };

    const handleOpenFindReplace = () => {
      setIsOpen(true);
      setShowReplace(true);
      editor.commands.openFindReplace();
      setTimeout(() => findInputRef.current?.focus(), 50);
    };

    window.addEventListener('open-find', handleOpenFind);
    window.addEventListener('open-find-replace', handleOpenFindReplace);

    return () => {
      window.removeEventListener('open-find', handleOpenFind);
      window.removeEventListener('open-find-replace', handleOpenFindReplace);
    };
  }, [editor]);

  // Post findBarOpen message when isOpen changes
  useEffect(() => {
    if (typeof window.vscode !== 'undefined') {
      window.vscode.postMessage({ type: 'findBarOpen', open: isOpen });
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setFindValue('');
    setReplaceValue('');
    editor.commands.closeFind();
  }, [editor]);

  const handleFindChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFindValue(value);
      editor.commands.setFindQuery(value);
    },
    [editor]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        editor.commands.findNext();
      }
    },
    [editor, handleClose]
  );

  const matchCount = pluginState?.matches.length ?? 0;
  const activeIndex = pluginState?.activeIndex ?? 0;

  let counterText = 'No results';
  if (findValue && matchCount > 0) {
    counterText = `${activeIndex + 1} of ${matchCount}`;
  } else if (findValue && matchCount === 0) {
    counterText = 'No results';
  } else {
    counterText = '';
  }

  return (
    <div
      className="pm-find-bar"
      style={{ display: isOpen ? undefined : 'none' }}
      role="search"
      aria-label="Find and replace"
    >
      <div className="pm-find-row">
        <input
          ref={findInputRef}
          className="pm-find-input"
          type="text"
          placeholder="Find..."
          value={findValue}
          onChange={handleFindChange}
          onKeyDown={handleKeyDown}
          aria-label="Find"
        />
        <span className="pm-find-counter">{counterText}</span>
        <button
          type="button"
          onClick={() => editor.commands.findPrev()}
          aria-label="Previous match"
          title="Previous match"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => editor.commands.findNext()}
          aria-label="Next match"
          title="Next match"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>

      {showReplace && (
        <div className="pm-replace-row">
          <input
            className="pm-replace-input"
            type="text"
            placeholder="Replace..."
            value={replaceValue}
            onChange={(e) => setReplaceValue(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Replace"
          />
          <button
            type="button"
            className="pm-replace-btn"
            onClick={() => editor.commands.replaceCurrent(replaceValue)}
            aria-label="Replace"
          >
            Replace
          </button>
          <button
            type="button"
            className="pm-replace-all-btn"
            onClick={() => editor.commands.replaceAll(replaceValue)}
            aria-label="Replace all"
          >
            Replace All
          </button>
        </div>
      )}
    </div>
  );
}
