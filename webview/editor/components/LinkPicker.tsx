/**
 * Link Picker Component (React)
 *
 * Two-mode picker for inserting links:
 * 1. File picker - search and select workspace files
 * 2. URL form - enter URL and display text
 *
 * CSS selectors preserved for E2E tests:
 * - .link-picker
 * - .link-picker-header
 * - .link-picker-item / .link-picker-item.is-selected
 * - .link-picker-icon / .link-picker-title / .link-picker-description
 * - .link-picker-search / .link-picker-search-input
 * - .link-picker-files / .link-picker-empty
 * - .link-picker-form / .link-picker-input
 * - .link-picker-btn / .link-picker-btn-cancel / .link-picker-btn-submit
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react'
import type { IconNode } from 'lucide'
import { FileText, Globe } from 'lucide'
import { LucideIcon } from './LucideIcon'

/**
 * Simple path utilities for browser environment
 */
function pathDirname(p: string): string {
  const normalized = p.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  return lastSlash === -1 ? '.' : normalized.substring(0, lastSlash)
}

function pathRelative(from: string, to: string): string {
  const fromParts = from.replace(/\\/g, '/').split('/').filter(Boolean)
  const toParts = to.replace(/\\/g, '/').split('/').filter(Boolean)

  let commonLength = 0
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++
  }

  const upCount = fromParts.length - commonLength
  const relativeParts = []

  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..')
  }

  for (let i = commonLength; i < toParts.length; i++) {
    relativeParts.push(toParts[i])
  }

  return relativeParts.join('/') || '.'
}

export interface FileInfo {
  name: string
  path: string
  relativePath: string
}

export interface LinkData {
  text: string
  href: string
}

export type OnLinkSelect = (linkData: LinkData) => void

export interface LinkPickerOptions {
  rect: DOMRect
  onSelect: OnLinkSelect
  onCancel: () => void
}

function getVsCodeApi(): { postMessage: (msg: unknown) => void } | null {
  return (window as any).vscode || null
}

interface LinkPickerProps {
  rect: DOMRect
  onSelect: OnLinkSelect
  onCancel: () => void
}

export function LinkPicker({ rect, onSelect, onCancel }: LinkPickerProps) {
  const [mode, setMode] = useState<'menu' | 'file' | 'url'>('menu')
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentFilePath, setCurrentFilePath] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const elementRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const readyRef = useRef(false)

  // Position the picker
  const reposition = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = elementRef.current
        if (!el) return

        const menuRect = el.getBoundingClientRect()
        const { innerHeight, innerWidth } = window
        const menuHeight = menuRect.height || 320
        const menuWidth = menuRect.width || 300

        let top = rect.bottom + 8
        let left = rect.left

        if (top + menuHeight > innerHeight - 20) {
          top = rect.top - menuHeight - 8
        }

        if (left + menuWidth > innerWidth - 20) {
          left = innerWidth - menuWidth - 20
        }

        el.style.top = `${top}px`
        el.style.left = `${left}px`
      })
    })
  }, [rect])

  // Initial position + display
  useEffect(() => {
    const el = elementRef.current
    if (!el) return
    el.style.display = 'block'
    reposition()
  }, [reposition])

  // Reposition when mode changes
  useEffect(() => {
    reposition()
  }, [mode, files, reposition])

  // Listen for file list from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data
      if (message.type === 'files') {
        setFiles(message.payload.files)
        setCurrentFilePath(message.payload.currentFilePath)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Block Enter key immediately (prevents slash menu Enter from leaking)
  useEffect(() => {
    const blockEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', blockEnter, true)
    document.addEventListener('keyup', blockEnter, true)

    const timer = setTimeout(() => {
      document.removeEventListener('keydown', blockEnter, true)
      document.removeEventListener('keyup', blockEnter, true)
      readyRef.current = true
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', blockEnter, true)
      document.removeEventListener('keyup', blockEnter, true)
    }
  }, [])

  // Click-outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (elementRef.current && !elementRef.current.contains(target) && target.tagName !== 'INPUT') {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  // Global keydown for menu mode and escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!readyRef.current) return

      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancel()
        return
      }

      if (mode === 'menu') {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.min(prev + 1, 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selectedIndex === 0) {
            switchToFileMode()
          } else {
            setMode('url')
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mode, selectedIndex, onCancel])

  // Focus search input when switching to file mode
  useEffect(() => {
    if (mode === 'file') {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [mode, files])

  // Focus URL input when switching to url mode
  useEffect(() => {
    if (mode === 'url') {
      requestAnimationFrame(() => {
        urlInputRef.current?.focus()
      })
    }
  }, [mode])

  const switchToFileMode = useCallback(() => {
    setMode('file')
    setSelectedIndex(0)
    setSearchQuery('')
    const vscode = getVsCodeApi()
    if (vscode) {
      vscode.postMessage({ type: 'requestFiles', payload: {} })
    }
  }, [])

  const selectFile = useCallback((file: FileInfo) => {
    if (!file) return
    const currentDir = pathDirname(currentFilePath)
    const relativePath = pathRelative(currentDir, file.path)
    onSelect({ text: file.name, href: relativePath })
  }, [currentFilePath, onSelect])

  const submitUrl = useCallback((url: string, text: string) => {
    if (!url) return
    onSelect({ text: text || url, href: url })
  }, [onSelect])

  // Filter files based on search
  const filteredFiles = searchQuery
    ? files.filter((f) => {
        const searchTarget = `${f.name} ${f.relativePath}`.toLowerCase()
        return searchTarget.includes(searchQuery.toLowerCase())
      })
    : files

  const handleFilePickerKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredFiles[selectedIndex]) {
        selectFile(filteredFiles[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [filteredFiles, selectedIndex, selectFile, onCancel])

  const stopPropagation = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation()
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
      e.preventDefault()
    }
  }, [])

  return (
    <div
      ref={elementRef}
      className="link-picker"
      onMouseDown={(e) => {
        handleMouseDown(e)
        stopPropagation(e)
      }}
      onMouseUp={stopPropagation}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
    >
      {mode === 'menu' && (
        <MenuMode
          selectedIndex={selectedIndex}
          onFileClick={switchToFileMode}
          onUrlClick={() => setMode('url')}
        />
      )}
      {mode === 'file' && (
        <FilePickerMode
          files={filteredFiles}
          selectedIndex={selectedIndex}
          searchQuery={searchQuery}
          searchInputRef={searchInputRef}
          onSearchChange={(query) => {
            setSearchQuery(query)
            setSelectedIndex(0)
            const vscode = getVsCodeApi()
            if (vscode) {
              vscode.postMessage({ type: 'requestFiles', payload: { search: query } })
            }
          }}
          onKeyDown={handleFilePickerKeyDown}
          onSelectFile={selectFile}
        />
      )}
      {mode === 'url' && (
        <UrlFormMode
          urlInputRef={urlInputRef}
          onSubmit={submitUrl}
          onCancel={onCancel}
        />
      )}
    </div>
  )
}

// --- Sub-components ---

interface MenuModeProps {
  selectedIndex: number
  onFileClick: () => void
  onUrlClick: () => void
}

function MenuMode({ selectedIndex, onFileClick, onUrlClick }: MenuModeProps) {
  const menuItems: { icon: IconNode; title: string; description: string; action: () => void }[] = [
    { icon: FileText, title: 'Link to file', description: 'Search and link to a document', action: onFileClick },
    { icon: Globe, title: 'Link to URL', description: 'Link to an external URL', action: onUrlClick },
  ]

  return (
    <>
      <div className="link-picker-header">TYPE TO SEARCH</div>
      {menuItems.map((item, i) => (
        <button
          key={item.title}
          className={`link-picker-item${i === selectedIndex ? ' is-selected' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            item.action()
          }}
          type="button"
        >
          <span className="link-picker-icon">
            <LucideIcon icon={item.icon} size={16} />
          </span>
          <div className="link-picker-content">
            <span className="link-picker-title">{item.title}</span>
            <span className="link-picker-description">{item.description}</span>
          </div>
        </button>
      ))}
    </>
  )
}

interface FilePickerModeProps {
  files: FileInfo[]
  selectedIndex: number
  searchQuery: string
  searchInputRef: React.RefObject<HTMLInputElement | null>
  onSearchChange: (query: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onSelectFile: (file: FileInfo) => void
}

function FilePickerMode({
  files,
  selectedIndex,
  searchQuery,
  searchInputRef,
  onSearchChange,
  onKeyDown,
  onSelectFile,
}: FilePickerModeProps) {
  return (
    <>
      <div className="link-picker-search">
        <input
          ref={searchInputRef}
          type="text"
          className="link-picker-search-input"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="link-picker-files">
        {files.length === 0 ? (
          <div className="link-picker-empty">No files found</div>
        ) : (
          files.map((file, i) => (
            <button
              key={file.path}
              className={`link-picker-item${i === selectedIndex ? ' is-selected' : ''}`}
              onClick={() => onSelectFile(file)}
              type="button"
            >
              <div className="link-picker-content">
                <span className="link-picker-title">{file.name}</span>
                <span className="link-picker-description">{file.relativePath}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}

interface UrlFormModeProps {
  urlInputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (url: string, text: string) => void
  onCancel: () => void
}

function UrlFormMode({ urlInputRef, onSubmit, onCancel }: UrlFormModeProps) {
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [textEdited, setTextEdited] = useState(false)

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    if (!textEdited) {
      setText(value)
    }
  }, [textEdited])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit(url, text)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }, [url, text, onSubmit, onCancel])

  return (
    <div className="link-picker-form">
      <div className="link-picker-form-group">
        <input
          ref={urlInputRef}
          type="text"
          className="link-picker-input"
          placeholder="https://..."
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="link-picker-form-group">
        <input
          type="text"
          className="link-picker-input"
          placeholder="Link text"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setTextEdited(true)
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="link-picker-form-actions">
        <button
          className="link-picker-btn link-picker-btn-cancel"
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className="link-picker-btn link-picker-btn-submit"
          onClick={() => onSubmit(url, text)}
          type="button"
        >
          Insert Link
        </button>
      </div>
    </div>
  )
}
