/**
 * SlashCommandMenu React Component
 *
 * Notion-style "/" command menu rendered as a React component.
 * This component replaces the vanilla JS SlashCommandMenu class.
 *
 * CRITICAL: CSS selectors must be preserved for E2E tests:
 * - .slash-command-menu
 * - .slash-command-item
 * - .slash-command-item.is-selected
 * - .slash-command-title
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { Editor, Range } from '@tiptap/core';

/**
 * Command item definition
 */
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  searchTerms: string[];
  category?: 'style' | 'lists' | 'blocks' | 'media' | 'templates';
  command: (params: { editor: Editor; range: Range }) => void;
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[];
  editor: Editor;
  range: Range;
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * Category configuration for grouping and display
 */
const CATEGORY_CONFIG: {
  key: SlashCommandItem['category'] | 'blocks';
  label: string;
  fallback: boolean;
}[] = [
  { key: 'style', label: 'Style', fallback: false },
  { key: 'lists', label: 'Lists', fallback: false },
  { key: 'blocks', label: 'Blocks', fallback: true },
  { key: 'media', label: 'Media', fallback: false },
  { key: 'templates', label: 'Templates', fallback: false },
];

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, editor, range, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const selectedItemRef = useRef<HTMLButtonElement>(null);

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Scroll selected item into view
    useEffect(() => {
      if (selectedItemRef.current && menuRef.current) {
        const menu = menuRef.current;
        const item = selectedItemRef.current;

        const menuRect = menu.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();

        // Check if item is above visible area
        if (itemRect.top < menuRect.top) {
          item.scrollIntoView({ block: 'nearest' });
        }
        // Check if item is below visible area
        else if (itemRect.bottom > menuRect.bottom) {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    }, [selectedIndex]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          onSelect(item);
        }
      },
      [items, onSelect]
    );

    // Keyboard navigation exposed via imperative handle
    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: (event: KeyboardEvent) => {
          if (items.length === 0) {
            if (event.key === 'Escape') {
              onClose();
              return true;
            }
            return false;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
            return true;
          }

          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % items.length);
            return true;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            selectItem(selectedIndex);
            return true;
          }

          if (event.key === 'Escape') {
            onClose();
            return true;
          }

          return false;
        },
      }),
      [items.length, selectedIndex, selectItem, onClose]
    );

    // Group items by category
    const groupedItems = CATEGORY_CONFIG.map((config) => ({
      category: config.key,
      label: config.label,
      items: items.filter((item) => {
        // Match explicit category
        if (item.category === config.key) {
          return true;
        }
        // Fallback category for items without explicit category
        if (config.fallback && !item.category) {
          return true;
        }
        return false;
      }),
    })).filter((group) => group.items.length > 0);

    // Build flat index mapping for keyboard navigation
    let itemIndex = 0;

    // Handle empty state
    if (items.length === 0) {
      return (
        <div className="slash-command-menu" ref={menuRef}>
          <div className="slash-command-empty">No results</div>
        </div>
      );
    }

    return (
      <div className="slash-command-menu" ref={menuRef}>
        {groupedItems.map((group, groupIdx) => (
          <div key={group.category} className="slash-command-group">
            {/* Show separator before templates if there are preceding items */}
            {group.category === 'templates' && groupIdx > 0 && (
              <div className="slash-command-separator" />
            )}
            <div className="slash-command-category">{group.label}</div>
            {group.items.map((item) => {
              const currentIndex = itemIndex++;
              const isSelected = currentIndex === selectedIndex;

              return (
                <button
                  key={`${group.category}-${item.title}`}
                  ref={isSelected ? selectedItemRef : null}
                  className={`slash-command-item${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectItem(currentIndex)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                  type="button"
                >
                  <span className="slash-command-icon" dangerouslySetInnerHTML={{ __html: item.icon }} />
                  <span className="slash-command-title">{item.title}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  }
);

SlashCommandMenu.displayName = 'SlashCommandMenu';
