/**
 * Mermaid Diagram React NodeView Component
 *
 * A React-based NodeView for rendering and editing mermaid diagrams.
 * Handles async rendering, theme detection, view mode toggling, and code editing.
 *
 * Features:
 * - Async mermaid rendering with error handling
 * - Theme detection and updates (dark/light mode)
 * - View mode toggle (scroll/fit)
 * - Edit mode with textarea for mermaid code
 * - Custom undo/redo stack for the textarea
 * - Clipboard operations via VS Code API
 */

import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useState, useRef, useEffect, useCallback } from 'react'
import mermaid from 'mermaid'
import { Text, Minimize2, Maximize2 } from 'lucide'
import { LucideIcon } from '../components/LucideIcon'

// VS Code API type
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void
      getState: () => unknown
      setState: (state: unknown) => void
    }
    __pendingPasteTarget?: HTMLTextAreaElement
  }
}

// Mermaid initialization state
let mermaidInitialized = false

// Generate unique IDs for mermaid renders
let mermaidIdCounter = 0
function generateMermaidId(): string {
  return `mermaid-diagram-${Date.now()}-${++mermaidIdCounter}`
}

/**
 * Initialize mermaid with VS Code theme-aware settings
 */
function initMermaid() {
  if (mermaidInitialized) return

  const isDark =
    document.body.classList.contains('vscode-dark') ||
    getComputedStyle(document.body).backgroundColor.match(/rgb\((\d+)/)?.[1] === '0' ||
    parseInt(getComputedStyle(document.body).backgroundColor.match(/rgb\((\d+)/)?.[1] || '255') < 128

  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    themeVariables: isDark
      ? {
          // Dark theme with good contrast
          primaryColor: '#4a9eff',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#4a9eff',
          lineColor: '#888888',
          secondaryColor: '#3c3c3c',
          tertiaryColor: '#2d2d2d',
          background: '#1e1e1e',
          mainBkg: '#3c3c3c',
          nodeBorder: '#888888',
          clusterBkg: '#2d2d2d',
          clusterBorder: '#888888',
          titleColor: '#ffffff',
          edgeLabelBackground: '#2d2d2d',
          nodeTextColor: '#ffffff',
          textColor: '#ffffff',
          flowchartTitleText: '#ffffff',
        }
      : {
          primaryColor: '#0066b8',
          primaryTextColor: '#000000',
          primaryBorderColor: '#0066b8',
          lineColor: '#333333',
          secondaryColor: '#f0f0f0',
          tertiaryColor: '#ffffff',
          nodeTextColor: '#000000',
          textColor: '#000000',
        },
  })

  mermaidInitialized = true
}

/**
 * Reset mermaid initialization (called when theme changes)
 */
function resetMermaid() {
  mermaidInitialized = false
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

type ViewMode = 'scroll' | 'fit'

interface MermaidNodeViewProps extends NodeViewProps {}

export function MermaidNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: MermaidNodeViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('fit')
  const [renderedSvg, setRenderedSvg] = useState<string>('')
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() => document.body.classList.contains('vscode-dark'))

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const diagramContainerRef = useRef<HTMLDivElement>(null)

  // Undo/redo stack refs
  const undoStackRef = useRef<string[]>([])
  const redoStackRef = useRef<string[]>([])
  const lastSavedContentRef = useRef<string>(node.attrs.content || '')

  const content = node.attrs.content || ''

  /**
   * Apply SVG sizing based on view mode
   */
  const applySvgSizing = useCallback((svgEl: SVGSVGElement, mode: ViewMode) => {
    const viewBox = svgEl.getAttribute('viewBox')
    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(' ').map(Number)
      if (vbWidth && vbHeight) {
        if (mode === 'scroll') {
          svgEl.setAttribute('width', `${vbWidth}px`)
          svgEl.setAttribute('height', `${vbHeight}px`)
          svgEl.style.width = `${vbWidth}px`
          svgEl.style.height = `${vbHeight}px`
          svgEl.style.minWidth = `${vbWidth}px`
          svgEl.style.maxWidth = 'none'
        } else {
          svgEl.removeAttribute('width')
          svgEl.removeAttribute('height')
          svgEl.style.width = '100%'
          svgEl.style.height = 'auto'
          svgEl.style.minWidth = ''
          svgEl.style.maxWidth = '100%'
        }
      }
    }
  }, [])

  /**
   * Render the mermaid diagram
   */
  const renderDiagram = useCallback(async () => {
    initMermaid()

    const trimmedContent = content.trim()
    if (!trimmedContent) {
      setRenderedSvg('')
      setRenderError(null)
      return
    }

    try {
      const id = generateMermaidId()
      const { svg } = await mermaid.render(id, trimmedContent)
      setRenderedSvg(svg)
      setRenderError(null)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid mermaid syntax'
      setRenderedSvg('')
      setRenderError(errorMessage)
    }
  }, [content])

  /**
   * Apply sizing to rendered SVG when view mode changes or SVG is rendered
   */
  useEffect(() => {
    if (diagramContainerRef.current && renderedSvg) {
      const svgEl = diagramContainerRef.current.querySelector('svg')
      if (svgEl) {
        applySvgSizing(svgEl, viewMode)
      }
    }
  }, [renderedSvg, viewMode, applySvgSizing])

  /**
   * Render diagram on mount and when content changes
   */
  useEffect(() => {
    if (!isEditing) {
      renderDiagram()
    }
  }, [content, isEditing, renderDiagram])

  /**
   * Listen for theme changes
   */
  useEffect(() => {
    const handleThemeChange = () => {
      resetMermaid()
      setIsDark(document.body.classList.contains('vscode-dark'))
      if (!isEditing) {
        renderDiagram()
      }
    }

    // Listen for custom theme change event
    window.addEventListener('mermaid-theme-changed', handleThemeChange)

    // Also observe body class changes directly
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          resetMermaid()
          setIsDark(document.body.classList.contains('vscode-dark'))
          // Dispatch event for other instances
          window.dispatchEvent(new CustomEvent('mermaid-theme-changed'))
        }
      }
    })

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('mermaid-theme-changed', handleThemeChange)
      observer.disconnect()
    }
  }, [isEditing, renderDiagram])

  /**
   * Focus textarea when entering edit mode
   */
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  /**
   * Undo/redo helpers
   */
  const saveUndoState = useCallback(() => {
    if (!textareaRef.current) return
    const current = textareaRef.current.value
    if (current !== lastSavedContentRef.current) {
      undoStackRef.current.push(lastSavedContentRef.current)
      redoStackRef.current = []
      lastSavedContentRef.current = current
    }
  }, [])

  const undo = useCallback(() => {
    if (!textareaRef.current || undoStackRef.current.length === 0) return
    const current = textareaRef.current.value
    redoStackRef.current.push(current)
    const prev = undoStackRef.current.pop()!
    textareaRef.current.value = prev
    lastSavedContentRef.current = prev
    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = prev.length
  }, [])

  const redo = useCallback(() => {
    if (!textareaRef.current || redoStackRef.current.length === 0) return
    const current = textareaRef.current.value
    undoStackRef.current.push(current)
    const next = redoStackRef.current.pop()!
    textareaRef.current.value = next
    lastSavedContentRef.current = next
    textareaRef.current.selectionStart = textareaRef.current.selectionEnd = next.length
  }, [])

  /**
   * Enter edit mode
   */
  const enterEditMode = useCallback(() => {
    if (isEditing) return
    setIsEditing(true)
    undoStackRef.current = [content]
    redoStackRef.current = []
    lastSavedContentRef.current = content
  }, [isEditing, content])

  /**
   * Exit edit mode
   */
  const exitEditMode = useCallback(
    (save: boolean = true) => {
      if (!isEditing) return
      setIsEditing(false)

      if (save && textareaRef.current && typeof getPos === 'function') {
        const newContent = textareaRef.current.value

        if (newContent !== content) {
          // Update using editor chain for proper history handling
          const pos = getPos()
          const currentNode = editor.state.doc.nodeAt(pos)

          if (currentNode) {
            editor
              .chain()
              .focus()
              .command(({ tr }) => {
                const mermaidNode = editor.schema.nodes.mermaid.create({ content: newContent })
                tr.replaceWith(pos, pos + currentNode.nodeSize, mermaidNode)
                return true
              })
              .run()
          }
        }
      }
    },
    [isEditing, content, editor, getPos]
  )

  /**
   * Handle deselection - exit edit mode when node is deselected
   */
  useEffect(() => {
    if (!selected && isEditing) {
      exitEditMode(true)
    }
  }, [selected, isEditing, exitEditMode])

  /**
   * Handle keyboard events in textarea
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const modifier = e.metaKey || e.ctrlKey

      // Paste via VS Code API
      if (modifier && e.key === 'v') {
        e.preventDefault()
        e.stopPropagation()
        window.__pendingPasteTarget = textarea
        window.vscode.postMessage({ type: 'requestClipboard' })
        return
      }

      // Undo
      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        undo()
        return
      }

      // Redo
      if (modifier && ((e.shiftKey && e.key === 'z') || e.key === 'y')) {
        e.preventDefault()
        e.stopPropagation()
        redo()
        return
      }

      // Select all - let it work normally but stop propagation
      if (modifier && e.key === 'a') {
        e.stopPropagation()
        return
      }

      // Copy via VS Code API
      if (modifier && e.key === 'c') {
        e.preventDefault()
        e.stopPropagation()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (start !== end) {
          const textToCopy = textarea.value.substring(start, end)
          window.vscode.postMessage({ type: 'copyToClipboard', payload: { text: textToCopy } })
        }
        return
      }

      // Cut via VS Code API
      if (modifier && e.key === 'x') {
        e.preventDefault()
        e.stopPropagation()
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (start !== end) {
          const textToCut = textarea.value.substring(start, end)
          window.vscode.postMessage({ type: 'copyToClipboard', payload: { text: textToCut } })
          saveUndoState()
          textarea.value = textarea.value.substring(0, start) + textarea.value.substring(end)
          textarea.selectionStart = textarea.selectionEnd = start
        }
        return
      }

      // Escape to exit without saving
      if (e.key === 'Escape') {
        e.preventDefault()
        if (textareaRef.current) {
          textareaRef.current.value = content
        }
        exitEditMode(false)
        editor.commands.focus()
        return
      }

      // Cmd/Ctrl+Enter to save and exit
      if (modifier && e.key === 'Enter') {
        e.preventDefault()
        exitEditMode(true)
        editor.commands.focus()
        return
      }

      // Tab for indent/dedent
      if (e.key === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        saveUndoState()

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const value = textarea.value

        if (e.shiftKey) {
          // Dedent: remove up to 4 spaces from start of line
          const lineStart = value.lastIndexOf('\n', start - 1) + 1
          const linePrefix = value.substring(lineStart, start)
          const spacesToRemove = Math.min(4, linePrefix.length - linePrefix.trimStart().length)
          if (spacesToRemove > 0) {
            textarea.value = value.substring(0, lineStart) + value.substring(lineStart + spacesToRemove)
            textarea.selectionStart = textarea.selectionEnd = start - spacesToRemove
          }
        } else {
          // Indent: insert 4 spaces
          textarea.value = value.substring(0, start) + '    ' + value.substring(end)
          textarea.selectionStart = textarea.selectionEnd = start + 4
        }
        return
      }

      // Delete node if empty and backspace/delete pressed
      const text = textarea.value
      const isEmpty = text === '' || text.trim() === ''

      if ((e.key === 'Backspace' || e.key === 'Delete') && isEmpty) {
        e.preventDefault()
        e.stopPropagation()
        setIsEditing(false)
        deleteNode()
        return
      }

      // Stop propagation for all other keys
      e.stopPropagation()
    },
    [content, editor, undo, redo, saveUndoState, exitEditMode, deleteNode]
  )

  /**
   * Handle input for undo state saving (debounced)
   */
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleInput = useCallback(() => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current)
    undoTimeoutRef.current = setTimeout(saveUndoState, 300)
  }, [saveUndoState])

  /**
   * Toggle view mode
   */
  const toggleViewMode = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setViewMode((prev) => (prev === 'scroll' ? 'fit' : 'scroll'))
  }, [])

  /**
   * Handle code button click
   */
  const handleCodeClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      enterEditMode()
    },
    [enterEditMode]
  )

  /**
   * Handle toolbar click to prevent propagation
   */
  const handleToolbarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Determine icon opacity based on hover state
  const iconColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'

  return (
    <NodeViewWrapper
      className={`mermaid-node ${selected ? 'is-selected' : ''} ${isEditing ? 'is-editing' : ''}`}
    >
      {/* Diagram wrapper with toolbar */}
      <div className="mermaid-diagram-wrapper" style={{ position: 'relative' }}>
        {/* Diagram container */}
        <div
          ref={diagramContainerRef}
          className={`mermaid-diagram ${viewMode === 'scroll' ? 'mermaid-scroll-mode' : 'mermaid-fit-mode'}`}
        >
          {!content.trim() ? (
            <div className="mermaid-placeholder">Click to add diagram</div>
          ) : renderError ? (
            <div className="mermaid-error">
              <div className="mermaid-error-title">Diagram Error</div>
              <div
                className="mermaid-error-message"
                dangerouslySetInnerHTML={{ __html: escapeHtml(renderError) }}
              />
            </div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: renderedSvg }} />
          )}
        </div>

        {/* Toolbar */}
        <div
          className="mermaid-toolbar"
          onClick={handleToolbarClick}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            left: 'auto',
            pointerEvents: 'auto',
          }}
        >
          <button
            className="mermaid-view-toggle"
            type="button"
            title="Edit code"
            onClick={handleCodeClick}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              color: iconColor,
            }}
          >
            <LucideIcon icon={Text} size={16} />
          </button>
          <button
            className="mermaid-view-toggle"
            type="button"
            title={viewMode === 'scroll' ? 'Fit to view' : 'Scroll mode'}
            onClick={toggleViewMode}
            style={{
              border: 'none',
              background: 'none',
              outline: 'none',
              color: iconColor,
            }}
          >
            {viewMode === 'scroll' ? <LucideIcon icon={Minimize2} size={16} /> : <LucideIcon icon={Maximize2} size={16} />}
          </button>
        </div>
      </div>

      {/* Edit container */}
      <div className="mermaid-edit">
        <textarea
          ref={textareaRef}
          className="mermaid-textarea"
          defaultValue={content}
          placeholder="Enter mermaid diagram code..."
          spellCheck={false}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          onInput={handleInput}
          onBlur={() => exitEditMode(true)}
        />
      </div>
    </NodeViewWrapper>
  )
}
