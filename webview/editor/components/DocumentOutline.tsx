// webview/editor/components/DocumentOutline.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import type { Editor } from '@tiptap/core'

interface HeadingItem {
  id: string
  level: number
  text: string
  pos: number
}

interface DocumentOutlineProps {
  editor: Editor
}

/**
 * Resolve a ProseMirror heading position to its DOM element.
 * `pos` is the position before the heading node (from doc.descendants),
 * so we use nodeDOM(pos) which returns the actual DOM node at that position.
 */
function resolveHeadingDOM(editor: Editor, pos: number): Element | null {
  try {
    // nodeDOM returns the outermost DOM node for the ProseMirror node at pos
    const directNode = editor.view.nodeDOM(pos)
    if (directNode instanceof HTMLElement) return directNode
    // Fallback: pos+1 is inside the heading, walk up to find it
    const domPos = editor.view.domAtPos(pos + 1)
    const node = domPos.node instanceof HTMLElement
      ? domPos.node
      : domPos.node.parentElement
    if (!node) return null
    return node.closest('h1, h2, h3, h4, h5, h6')
  } catch {
    return null
  }
}

export function DocumentOutline({ editor }: DocumentOutlineProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const hideTimeoutRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  // Extract headings from editor content.
  // Only update when the document content actually changes.
  useEffect(() => {
    let lastDocJSON = ''

    const updateHeadings = () => {
      const docJSON = JSON.stringify(editor.state.doc.toJSON())
      if (docJSON === lastDocJSON) return
      lastDocJSON = docJSON

      const items: HeadingItem[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          items.push({
            id: `heading-${items.length}`,
            level: node.attrs.level,
            text: node.textContent,
            pos,
          })
        }
      })
      console.log('[DocumentOutline] Found', items.length, 'headings')
      setHeadings(items)
    }

    updateHeadings()
    editor.on('transaction', updateHeadings)

    return () => {
      editor.off('transaction', updateHeadings)
    }
  }, [editor])

  // DEBUG: Log scroll container info on mount
  useEffect(() => {
    if (headings.length === 0) return

    const prosemirror = document.querySelector('.ProseMirror')
    if (!prosemirror) {
      console.log('[DocumentOutline] No .ProseMirror element found')
      return
    }

    // Walk up the DOM tree and log each element's scroll properties
    let el: HTMLElement | null = prosemirror as HTMLElement
    while (el) {
      const style = window.getComputedStyle(el)
      const overflow = style.overflow + ' / ' + style.overflowY
      const scrollable = el.scrollHeight > el.clientHeight
      console.log('[DocumentOutline] Element:', el.tagName, el.id || el.className?.toString().substring(0, 30),
        '| overflow:', overflow,
        '| scrollHeight:', el.scrollHeight,
        '| clientHeight:', el.clientHeight,
        '| scrollable:', scrollable)
      el = el.parentElement
    }

    // Test: does window scroll event fire?
    const testScroll = () => console.log('[DocumentOutline] window scroll event fired! scrollY:', window.scrollY)
    window.addEventListener('scroll', testScroll, { capture: true })

    const testDocScroll = () => console.log('[DocumentOutline] document scroll event fired!')
    document.addEventListener('scroll', testDocScroll, { capture: true })

    const timer = setTimeout(() => {
      window.removeEventListener('scroll', testScroll, { capture: true })
      document.removeEventListener('scroll', testDocScroll, { capture: true })
    }, 30000)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', testScroll, { capture: true })
      document.removeEventListener('scroll', testDocScroll, { capture: true })
    }
  }, [headings.length === 0 ? 0 : 1]) // Run once headings appear

  // Track active heading by polling DOM positions during scroll
  useEffect(() => {
    if (headings.length === 0) return

    // Resolve heading DOM elements
    const headingEls: (Element | null)[] = headings.map(h => resolveHeadingDOM(editor, h.pos))

    console.log('[DocumentOutline] Resolved', headingEls.filter(Boolean).length, 'of', headings.length, 'heading DOM elements')
    headingEls.forEach((el, i) => {
      if (el) {
        const rect = el.getBoundingClientRect()
        console.log('[DocumentOutline] Heading', i, ':', headings[i].text.substring(0, 30), '| tag:', el.tagName, '| top:', Math.round(rect.top))
      } else {
        console.log('[DocumentOutline] Heading', i, ':', headings[i].text.substring(0, 30), '| FAILED to resolve DOM element')
      }
    })

    let isScrolling = false
    let scrollTimeout: number | null = null

    const computeActive = () => {
      let activeIdx = 0
      for (let i = 0; i < headingEls.length; i++) {
        const el = headingEls[i]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= 80) {
          activeIdx = i
        }
      }

      // When scrolled near the bottom, the last headings can never reach
      // the top threshold. Detect this and activate the last visible heading.
      const scrollEl = document.documentElement
      const atBottom = (window.innerHeight + window.scrollY) >= (scrollEl.scrollHeight - 50)
      if (atBottom) {
        // Find the last heading that's visible on screen
        for (let i = headingEls.length - 1; i >= 0; i--) {
          const el = headingEls[i]
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight) {
            activeIdx = i
            break
          }
        }
      }

      setActiveIndex(activeIdx)
    }

    const onFrame = () => {
      computeActive()
      if (isScrolling) {
        rafRef.current = requestAnimationFrame(onFrame)
      }
    }

    const onScrollStart = () => {
      if (!isScrolling) {
        isScrolling = true
        rafRef.current = requestAnimationFrame(onFrame)
      }
      if (scrollTimeout !== null) {
        window.clearTimeout(scrollTimeout)
      }
      scrollTimeout = window.setTimeout(() => {
        isScrolling = false
        scrollTimeout = null
        computeActive()
      }, 150)
    }

    // Compute once immediately
    computeActive()

    // Listen with capture to catch scroll events from any element
    window.addEventListener('scroll', onScrollStart, { capture: true, passive: true })

    return () => {
      window.removeEventListener('scroll', onScrollStart, { capture: true })
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (scrollTimeout !== null) {
        window.clearTimeout(scrollTimeout)
      }
    }
  }, [editor, headings])

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current !== null) {
      window.clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearHideTimeout()
    setIsHovered(true)
  }, [clearHideTimeout])

  const handleMouseLeave = useCallback(() => {
    clearHideTimeout()
    hideTimeoutRef.current = window.setTimeout(() => {
      setIsHovered(false)
    }, 150)
  }, [clearHideTimeout])

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [])

  const scrollToHeading = useCallback((pos: number) => {
    editor.commands.setTextSelection(pos + 1)
    editor.commands.focus()

    const headingEl = resolveHeadingDOM(editor, pos)
    console.log('[DocumentOutline] scrollToHeading pos:', pos, 'resolved el:', headingEl?.tagName, headingEl?.textContent?.substring(0, 30))
    if (headingEl) {
      headingEl.scrollIntoView({ block: 'start', behavior: 'smooth' })
    } else {
      editor.commands.scrollIntoView()
    }
  }, [editor])

  if (headings.length === 0) {
    return null
  }

  return (
    <div
      className="document-outline"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="outline-bars">
        {headings.map((heading, i) => (
          <button
            key={heading.id}
            className={`outline-bar outline-bar-level-${heading.level}${i === activeIndex ? ' outline-bar-active' : ''}`}
            onClick={() => scrollToHeading(heading.pos)}
            title={heading.text || 'Untitled'}
            type="button"
            aria-label={heading.text || 'Untitled'}
          />
        ))}
      </div>
      <div className={`outline-popover${isHovered ? ' outline-popover-visible' : ''}`}>
        {headings.map((heading, i) => (
          <button
            key={heading.id}
            className={`outline-item outline-item-level-${heading.level}${i === activeIndex ? ' outline-item-active' : ''}`}
            onClick={() => scrollToHeading(heading.pos)}
            type="button"
          >
            {heading.text || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  )
}
