/**
 * Table Size Picker Component (React)
 *
 * A grid UI for selecting table dimensions (rows x columns)
 * Inspired by Notion/Word table insertion UI
 *
 * CSS selectors preserved for E2E tests:
 * - .table-size-picker
 * - .table-size-picker-header
 * - .table-size-picker-grid
 * - .table-size-picker-cell
 * - .table-size-picker-cell.is-highlighted
 * - .table-size-picker-label
 */

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'

export interface TableSize {
  rows: number
  cols: number
}

export type TableSizeCallback = (size: TableSize) => void

const MAX_ROWS = 8
const MAX_COLS = 8
const DEFAULT_ROWS = 3
const DEFAULT_COLS = 3

interface TableSizePickerProps {
  rect: DOMRect
  onSelect: TableSizeCallback
  onCancel: () => void
}

export function TableSizePicker({ rect, onSelect, onCancel }: TableSizePickerProps) {
  const [hoveredSize, setHoveredSize] = useState<TableSize>({ rows: DEFAULT_ROWS, cols: DEFAULT_COLS })
  const elementRef = useRef<HTMLDivElement>(null)
  const hoveredSizeRef = useRef(hoveredSize)
  hoveredSizeRef.current = hoveredSize

  // Stable refs for callbacks so effects don't re-run
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  // Position the picker
  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const { innerHeight, innerWidth } = window

    let top = rect.bottom + 8
    let left = rect.left

    if (top + 280 > innerHeight - 20) {
      top = rect.top - 280 - 8
    }

    if (left + 220 > innerWidth - 20) {
      left = innerWidth - 220 - 20
    }

    el.style.top = `${top}px`
    el.style.left = `${left}px`
    el.style.display = 'block'
  }, [rect])

  // Keyboard and click-outside handling (delayed to prevent slash menu Enter from leaking)
  useEffect(() => {
    let ready = false
    const timer = setTimeout(() => {
      ready = true
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!ready) return

      if (e.key === 'Escape') {
        onCancelRef.current()
      } else if (e.key === 'Enter') {
        onSelectRef.current(hoveredSizeRef.current)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setHoveredSize((prev) => ({ ...prev, cols: Math.min(prev.cols + 1, MAX_COLS) }))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setHoveredSize((prev) => ({ ...prev, cols: Math.max(prev.cols - 1, 1) }))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHoveredSize((prev) => ({ ...prev, rows: Math.min(prev.rows + 1, MAX_ROWS) }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHoveredSize((prev) => ({ ...prev, rows: Math.max(prev.rows - 1, 1) }))
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (!ready) return
      if (elementRef.current && !elementRef.current.contains(e.target as Node)) {
        onCancelRef.current()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClickOutside)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClickOutside)
    }
  }, []) // stable — reads from refs

  // Build grid cells
  const cells = []
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let col = 0; col < MAX_COLS; col++) {
      const r = row + 1
      const c = col + 1
      const isHighlighted = r <= hoveredSize.rows && c <= hoveredSize.cols

      cells.push(
        <div
          key={`${r}-${c}`}
          className={`table-size-picker-cell${isHighlighted ? ' is-highlighted' : ''}`}
          onMouseEnter={() => setHoveredSize({ rows: r, cols: c })}
          onClick={(e) => {
            e.stopPropagation()
            onSelect({ rows: r, cols: c })
          }}
        />
      )
    }
  }

  return (
    <div
      ref={elementRef}
      className="table-size-picker"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="table-size-picker-header">Insert Table</div>
      <div className="table-size-picker-grid">{cells}</div>
      <div className="table-size-picker-label">
        {hoveredSize.cols} &times; {hoveredSize.rows}
      </div>
    </div>
  )
}
