/**
 * CommentsPanel Component
 *
 * Displays all inline comments parsed from the document.
 * Rendered inside the editor WebView (not a separate VS Code panel).
 * Hidden when there are no comments.
 *
 * CSS selectors used by E2E tests:
 * - .pm-comments-panel
 * - .pm-comments-header
 * - .pm-comment-entry
 * - .pm-comment-highlight
 * - .pm-comment-text
 * - .pm-comment-actions
 * - .pm-comment-edit-row
 * - .pm-comment-edit-actions
 * - .pm-comment-textarea
 */

import React, { useState } from 'react';
import { ParsedComment } from '../extensions/CommentMark';

interface Props {
  comments: ParsedComment[];
  onDelete: (id: string, highlightText: string) => void;
  onEdit: (id: string, highlightText: string, newCommentText: string) => void;
}

export function CommentsPanel({ comments, onDelete, onEdit }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!comments.length) return null;

  return (
    <div className="pm-comments-panel">
      <div className="pm-comments-header">Comments ({comments.length})</div>
      {comments.map((c) => (
        <div key={c.id} className="pm-comment-entry">
          <div className="pm-comment-highlight">"{c.highlightText}"</div>
          {editing === c.id ? (
            <div className="pm-comment-edit-row">
              <textarea
                className="pm-comment-textarea"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                rows={2}
              />
              <div className="pm-comment-edit-actions">
                <button
                  onClick={() => {
                    onEdit(c.id, c.highlightText, editValue);
                    setEditing(null);
                  }}
                >
                  Save
                </button>
                <button onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="pm-comment-body">
              <span className="pm-comment-text">{c.commentText}</span>
              <div className="pm-comment-actions">
                <button
                  onClick={() => {
                    setEditing(c.id);
                    setEditValue(c.commentText);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => onDelete(c.id, c.highlightText)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
