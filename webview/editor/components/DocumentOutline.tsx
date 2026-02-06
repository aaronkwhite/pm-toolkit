// webview/editor/components/DocumentOutline.tsx
import { useEffect, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/core'
import type { TableOfContentsStorage } from '@tiptap/extension-table-of-contents'

interface HeadingItem {
  id: string
  level: number
  text: string
  pos: number
}

interface DocumentOutlineProps {
  editor: Editor
}

export function DocumentOutline({ editor }: DocumentOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Extract headings from editor content
  useEffect(() => {
    const updateHeadings = () => {
      const storage = editor.storage.tableOfContents as TableOfContentsStorage | undefined
      if (storage?.content) {
        setHeadings(storage.content.map((item, index) => ({
          id: `heading-${index}`,
          level: item.level,
          text: item.textContent,
          pos: item.pos,
        })))
      } else {
        // Fallback: manually extract headings
        const items: HeadingItem[] = []
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'heading') {
            items.push({
              id: `heading-${pos}`,
              level: node.attrs.level,
              text: node.textContent,
              pos,
            })
          }
        })
        setHeadings(items)
      }
    }

    updateHeadings()
    editor.on('update', updateHeadings)
    return () => {
      editor.off('update', updateHeadings)
    }
  }, [editor])

  // Restore collapsed state from VS Code webview state
  useEffect(() => {
    const state = window.vscode.getState() as { outlineCollapsed?: boolean } | undefined
    if (state?.outlineCollapsed) {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      const state = (window.vscode.getState() as Record<string, unknown>) || {}
      window.vscode.setState({ ...state, outlineCollapsed: next })
      return next
    })
  }, [])

  const scrollToHeading = useCallback((pos: number) => {
    editor.commands.setTextSelection(pos)
    editor.commands.scrollIntoView()
    editor.commands.focus()
  }, [editor])

  if (headings.length === 0) {
    return null // Don't show outline if no headings
  }

  return (
    <div className={`document-outline ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="outline-header">
        <span className="outline-title">Outline</span>
        <button
          className="outline-toggle"
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand outline' : 'Collapse outline'}
          type="button"
        >
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>
      {!isCollapsed && (
        <nav className="outline-content">
          {headings.map(heading => (
            <button
              key={heading.id}
              className={`outline-item outline-level-${heading.level}`}
              onClick={() => scrollToHeading(heading.pos)}
              type="button"
            >
              {heading.text || 'Untitled'}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}
