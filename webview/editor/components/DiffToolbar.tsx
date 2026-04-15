import type { Editor } from '@tiptap/core';
import { useEffect, useState } from 'react';
import { aiDiffKey } from '../extensions/AiDiff';

interface DiffToolbarProps {
  editor: Editor;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffToolbar({ editor, onAccept, onReject }: DiffToolbarProps) {
  const [regions, setRegions] = useState<unknown[]>([]);
  const [mode, setMode] = useState<string>('off');

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      const state = aiDiffKey.getState(editor.state);
      if (state) {
        setRegions(state.regions);
        setMode(state.mode);
      }
    };

    editor.on('transaction', updateState);
    updateState();

    return () => {
      editor.off('transaction', updateState);
    };
  }, [editor]);

  if (mode !== 'claude-code' || regions.length === 0) {
    return null;
  }

  const count = regions.length;

  return (
    <div className="pm-diff-toolbar">
      <span className="pm-diff-count">
        {count} AI change{count !== 1 ? 's' : ''}
      </span>
      <button className="pm-diff-accept" onClick={onAccept}>
        Accept All
      </button>
      <button className="pm-diff-reject" onClick={onReject}>
        Reject All
      </button>
    </div>
  );
}
