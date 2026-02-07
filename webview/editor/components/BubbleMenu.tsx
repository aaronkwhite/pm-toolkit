/**
 * Bubble Menu Component (React)
 *
 * Floating toolbar that appears when text is selected,
 * providing quick access to text formatting options.
 *
 * Uses Tiptap's built-in BubbleMenu component for positioning/visibility.
 *
 * CSS selectors preserved for E2E tests:
 * - .bubble-menu
 * - .bubble-menu-content
 * - .bubble-menu-block-dropdown / .bubble-menu-block-dropdown.is-open
 * - .bubble-menu-block-btn / .bubble-menu-block-label
 * - .bubble-menu-dropdown / .bubble-menu-dropdown-item / .bubble-menu-dropdown-item.is-active
 * - .bubble-menu-separator
 * - .bubble-menu-marks
 * - .bubble-menu-btn / .bubble-menu-btn.is-active
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { BubbleMenu as TiptapBubbleMenu } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import type { Editor } from '@tiptap/core'
import { createElement } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { LinkPicker, type LinkData } from './LinkPicker'

/**
 * Lucide icon SVGs (16x16, stroke-width 2.5)
 */
const icons = {
  bold: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H6V4h8a4 4 0 0 1 0 8"></path></svg>`,
  italic: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>`,
  strikethrough: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"></path><path d="M14 12a4 4 0 0 1 0 8H6"></path><line x1="4" y1="12" x2="20" y2="12"></line></svg>`,
  code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
  link: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`,
  chevronDown: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
}

/**
 * Block type definitions
 */
interface BlockType {
  id: string
  label: string
  check: (editor: Editor) => boolean
  command: (editor: Editor) => void
}

const blockTypes: BlockType[] = [
  {
    id: 'paragraph',
    label: 'Text',
    check: (editor) => editor.isActive('paragraph') && !editor.isActive('bulletList') && !editor.isActive('orderedList') && !editor.isActive('taskList'),
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    label: 'Heading 1',
    check: (editor) => editor.isActive('heading', { level: 1 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'Heading 2',
    check: (editor) => editor.isActive('heading', { level: 2 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'Heading 3',
    check: (editor) => editor.isActive('heading', { level: 3 }),
    command: (editor) => editor.chain().focus().setHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bullet list',
    check: (editor) => editor.isActive('bulletList'),
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Numbered list',
    check: (editor) => editor.isActive('orderedList'),
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'Task list',
    check: (editor) => editor.isActive('taskList'),
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    check: (editor) => editor.isActive('blockquote'),
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    check: (editor) => editor.isActive('codeBlock'),
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
]

/**
 * Mark button definitions
 */
interface MarkButton {
  id: string
  icon: string
  title: string
  shortcut: string
  check: (editor: Editor) => boolean
  command: (editor: Editor) => void
}

const markButtons: MarkButton[] = [
  {
    id: 'bold',
    icon: icons.bold,
    title: 'Bold',
    shortcut: '\u2318B',
    check: (editor) => editor.isActive('bold'),
    command: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    icon: icons.italic,
    title: 'Italic',
    shortcut: '\u2318I',
    check: (editor) => editor.isActive('italic'),
    command: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'strike',
    icon: icons.strikethrough,
    title: 'Strikethrough',
    shortcut: '\u2318\u21E7S',
    check: (editor) => editor.isActive('strike'),
    command: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'code',
    icon: icons.code,
    title: 'Inline code',
    shortcut: '\u2318E',
    check: (editor) => editor.isActive('code'),
    command: (editor) => editor.chain().focus().toggleCode().run(),
  },
]

interface BubbleMenuToolbarProps {
  editor: Editor
}

export function BubbleMenuToolbar({ editor }: BubbleMenuToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const linkPickerContainerRef = useRef<HTMLDivElement | null>(null)
  const linkPickerRootRef = useRef<Root | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside the menu
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  // Cleanup link picker on unmount
  useEffect(() => {
    return () => {
      cleanupLinkPicker()
    }
  }, [])

  const cleanupLinkPicker = useCallback(() => {
    if (linkPickerRootRef.current) {
      linkPickerRootRef.current.unmount()
      linkPickerRootRef.current = null
    }
    if (linkPickerContainerRef.current) {
      linkPickerContainerRef.current.remove()
      linkPickerContainerRef.current = null
    }
  }, [])

  const shouldShow = useCallback(({ editor, state }: { editor: Editor; state: any }) => {
    const { selection } = state
    const { empty, from, to } = selection

    if (empty) return false
    if (selection instanceof NodeSelection) return false
    if (editor.isActive('codeBlock')) return false

    // Don't show if selection is inside a table
    const $from = state.doc.resolve(from)
    const $to = state.doc.resolve(to)
    for (let d = $from.depth; d >= 0; d--) {
      if ($from.node(d).type.name === 'table') return false
    }
    for (let d = $to.depth; d >= 0; d--) {
      if ($to.node(d).type.name === 'table') return false
    }

    return true
  }, [])

  const getCurrentBlockType = useCallback((): BlockType => {
    for (const type of blockTypes) {
      if (type.check(editor)) {
        return type
      }
    }
    return blockTypes[0]
  }, [editor])

  const handleBlockTypeSelect = useCallback((blockType: BlockType) => {
    blockType.command(editor)
    setDropdownOpen(false)
  }, [editor])

  const handleMarkClick = useCallback((mark: MarkButton) => {
    mark.command(editor)
  }, [editor])

  const handleLinkClick = useCallback(() => {
    const { state } = editor
    const { from, to } = state.selection

    // If already a link, remove it
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }

    // Get position for link picker
    const { view } = editor
    const coords = view.coordsAtPos(from)
    const rect = new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)

    // Save selection
    const savedFrom = from
    const savedTo = to

    // Freeze editor
    editor.setEditable(false)

    // Create portal container for LinkPicker
    const container = document.createElement('div')
    document.body.appendChild(container)
    linkPickerContainerRef.current = container

    const root = createRoot(container)
    linkPickerRootRef.current = root

    const handleSelect = (linkData: LinkData) => {
      editor.setEditable(true)
      setTimeout(() => {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: savedFrom, to: savedTo })
          .setLink({ href: linkData.href })
          .run()
      }, 0)
      cleanupLinkPicker()
    }

    const handleCancel = () => {
      editor.setEditable(true)
      setTimeout(() => {
        editor
          .chain()
          .focus()
          .setTextSelection({ from: savedFrom, to: savedTo })
          .run()
      }, 0)
      cleanupLinkPicker()
    }

    root.render(createElement(LinkPicker, { rect, onSelect: handleSelect, onCancel: handleCancel }))
  }, [editor, cleanupLinkPicker])

  const currentBlockType = getCurrentBlockType()

  return (
    <TiptapBubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      tippyOptions={{
        duration: 150,
        placement: 'top',
        interactive: true,
        // Keep tippy inside React's root so React synthetic events work.
        // React 18 attaches event delegation to the createRoot() container;
        // elements appended to document.body are outside that tree.
        appendTo: () => document.getElementById('editor') || document.body,
        zIndex: 9999,
      }}
    >
      <div
        ref={menuRef}
        className="bubble-menu"
        onMouseDown={(e) => {
          // Prevent editor from losing selection, but don't stop propagation
          // so child buttons can still receive click events
          e.preventDefault()
        }}
      >
        <div className="bubble-menu-content">
          <div className={`bubble-menu-block-dropdown${dropdownOpen ? ' is-open' : ''}`}>
            <button
              className="bubble-menu-block-btn"
              title="Change block type"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              type="button"
            >
              <span className="bubble-menu-block-label">{currentBlockType.label}</span>
              <span dangerouslySetInnerHTML={{ __html: icons.chevronDown }} />
            </button>
            {dropdownOpen && (
              <div className="bubble-menu-dropdown">
                {blockTypes.map((type) => (
                  <button
                    key={type.id}
                    className={`bubble-menu-dropdown-item${type.check(editor) ? ' is-active' : ''}`}
                    onClick={() => handleBlockTypeSelect(type)}
                    type="button"
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="bubble-menu-separator" />
          <div className="bubble-menu-marks">
            {markButtons.map((btn) => (
              <button
                key={btn.id}
                className={`bubble-menu-btn${btn.check(editor) ? ' is-active' : ''}`}
                title={`${btn.title} (${btn.shortcut})`}
                onClick={() => handleMarkClick(btn)}
                type="button"
              >
                <span dangerouslySetInnerHTML={{ __html: btn.icon }} />
              </button>
            ))}
            <button
              className={`bubble-menu-btn${editor.isActive('link') ? ' is-active' : ''}`}
              title="Link (\u2318K)"
              onClick={() => handleLinkClick()}
              type="button"
            >
              <span dangerouslySetInnerHTML={{ __html: icons.link }} />
            </button>
          </div>
        </div>
      </div>
    </TiptapBubbleMenu>
  )
}
