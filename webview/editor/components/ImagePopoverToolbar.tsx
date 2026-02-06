/**
 * ImagePopoverToolbar Component
 *
 * Floating toolbar shown above a selected image.
 * Provides alignment controls, replace, and delete actions.
 */

interface ImagePopoverToolbarProps {
  textAlign: string | null;
  hasCaption: boolean;
  onAlignChange: (align: 'left' | 'center' | 'right') => void;
  onToggleCaption: () => void;
  onReplace: () => void;
  onDelete: () => void;
}

// Inline SVG icons (Lucide-style, matching project conventions)
const AlignLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="17" y1="10" x2="3" y2="10" />
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" />
    <line x1="17" y1="18" x2="3" y2="18" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="10" x2="6" y2="10" />
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" />
    <line x1="18" y1="18" x2="6" y2="18" />
  </svg>
);

const AlignRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="10" x2="7" y2="10" />
    <line x1="21" y1="6" x2="3" y2="6" />
    <line x1="21" y1="14" x2="3" y2="14" />
    <line x1="21" y1="18" x2="7" y2="18" />
  </svg>
);

const ReplaceIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
    <path d="M16 16h5v5" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const CaptionIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="12" rx="2" />
    <path d="M7 20h10" />
  </svg>
);

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
        <AlignLeftIcon />
      </button>
      <button
        type="button"
        className={`image-popover-btn ${textAlign === 'center' ? 'is-active' : ''}`}
        onClick={() => onAlignChange('center')}
        title="Align center"
        aria-label="Align center"
      >
        <AlignCenterIcon />
      </button>
      <button
        type="button"
        className={`image-popover-btn ${textAlign === 'right' ? 'is-active' : ''}`}
        onClick={() => onAlignChange('right')}
        title="Align right"
        aria-label="Align right"
      >
        <AlignRightIcon />
      </button>

      <div className="image-popover-separator" />

      <button
        type="button"
        className={`image-popover-btn ${hasCaption ? 'is-active' : ''}`}
        onClick={onToggleCaption}
        title="Toggle caption"
        aria-label="Toggle caption"
      >
        <CaptionIcon />
      </button>
      <button
        type="button"
        className="image-popover-btn"
        onClick={onReplace}
        title="Replace image"
        aria-label="Replace image"
      >
        <ReplaceIcon />
      </button>
      <button
        type="button"
        className="image-popover-btn"
        onClick={onDelete}
        title="Delete image"
        aria-label="Delete image"
      >
        <TrashIcon />
      </button>
    </div>
  );
}
