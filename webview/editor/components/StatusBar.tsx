import { useEffect, useState } from 'react';
import type { Editor, EditorEvents } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';

interface Props { editor: Editor }

function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function countLines(doc: Node): number {
  let count = 0;
  doc.forEach((node) => {
    if (node.isBlock && node.textContent.trim() !== '') {
      count++;
    }
  });
  return count;
}

export function StatusBar({ editor }: Props) {
  const [words, setWords] = useState(0);
  const [lines, setLines] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const update = ({ transaction }: EditorEvents['transaction']) => {
      // Selection-only transactions cannot change word or line counts.
      if (!transaction.docChanged) return;
      const doc = transaction.doc;
      setWords(countWords(doc.textContent));
      setLines(countLines(doc));
    };
    editor.on('transaction', update);
    // Seed counts from the current document without a transaction.
    const doc = editor.state.doc;
    setWords(countWords(doc.textContent));
    setLines(countLines(doc));
    return () => { editor.off('transaction', update); };
  }, [editor]);

  return (
    <div className="pm-status-bar">
      <span>{words} {words === 1 ? 'word' : 'words'}</span>
      <span className="pm-status-bar-sep">·</span>
      <span>{lines} {lines === 1 ? 'line' : 'lines'}</span>
    </div>
  );
}
