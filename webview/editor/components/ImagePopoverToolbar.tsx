/**
 * ImagePopoverToolbar Component
 *
 * Floating toolbar shown above a selected image.
 * Provides alignment controls, replace, and delete actions.
 */

import { AlignLeft, AlignCenter, AlignRight, RefreshCw, Trash2, Captions } from 'lucide';
import { LucideIcon } from './LucideIcon';

interface ImagePopoverToolbarProps {
  textAlign: string | null;
  hasCaption: boolean;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onToggleCaption: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

export function ImagePopoverToolbar({
  textAlign,
  hasCaption,
  onAlignChange,
  onToggleCaption,
  onReplace,
  onDelete,
}: ImagePopoverToolbarProps) {
  // Prevent toolbar clicks from deselecting the image
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="image-popover-toolbar" onMouseDown={handleMouseDown}>
      <button
        type="button"
        className={`image-popover-btn ${!textAlign || textAlign === 'left' ? 'is-active' : ''}`}
        onClick={() => onAlignChange('left')}
        title="Align left"
        aria-label="Align left"
      >
        <LucideIcon icon={AlignLeft} size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className={`image-popover-btn ${textAlign === 'center' ? 'is-active' : ''}`}
        onClick={() => onAlignChange('center')}
        title="Align center"
        aria-label="Align center"
      >
        <LucideIcon icon={AlignCenter} size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className={`image-popover-btn ${textAlign === 'right' ? 'is-active' : ''}`}
        onClick={() => onAlignChange('right')}
        title="Align right"
        aria-label="Align right"
      >
        <LucideIcon icon={AlignRight} size={16} strokeWidth={2.5} />
      </button>

      <div className="image-popover-separator" />

      <button
        type="button"
        className={`image-popover-btn ${hasCaption ? 'is-active' : ''}`}
        onClick={onToggleCaption}
        title="Toggle caption"
        aria-label="Toggle caption"
      >
        <LucideIcon icon={Captions} size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className="image-popover-btn"
        onClick={onReplace}
        title="Replace image"
        aria-label="Replace image"
      >
        <LucideIcon icon={RefreshCw} size={16} strokeWidth={2.5} />
      </button>
      <button
        type="button"
        className="image-popover-btn"
        onClick={onDelete}
        title="Delete image"
        aria-label="Delete image"
      >
        <LucideIcon icon={Trash2} size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
