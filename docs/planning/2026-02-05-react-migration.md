# PM Toolkit React Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the PM Toolkit editor from vanilla TypeScript to React with @tiptap/react, enabling use of Tiptap UI Components and adding new features (drag handles, insert plus button, document outline, enhanced image handling).

---

## Progress Status (2026-02-06)

### Completed Milestones ✅

| Milestone | Status | Notes |
|-----------|--------|-------|
| M1: React Foundation | ✅ Complete | React 18, @tiptap/react, esbuild JSX config |
| M2: SlashCommand React | ✅ Complete | SlashCommandMenu component working |
| M3: ImageNode React | ✅ Complete | ReactNodeViewRenderer, complete redesign (see below) |
| M4: MermaidNode React | ✅ Complete | Async rendering, theme detection |
| M5: BubbleMenu React | ✅ Complete | Block type dropdown, formatting marks |
| M6: UI Components | ✅ Complete | CSS variables integration |
| M7: Block Handles | ✅ Complete | Plus button + drag handle (hover to show) |
| M8: Enhanced Image Handling | ✅ Complete | Full redesign (see Image System Redesign below) |
| M9: Document Outline | ✅ Complete | Horizontal bar style, click to scroll |
| Table Controls | ✅ Complete | Grips, drag-to-reorder, context menus (see below) |

### Test Results
- **277/277 tests passing** (0 failures)
- Comprehensive E2E coverage for images, tables, serialization, VS Code handlers, settings

### Key Fixes Applied
1. **vscode API timing**: Changed from module-level `const vscode = window.vscode` to `getVSCode()` function to handle async initialization
2. **Document Outline**: Added `transaction` event listener to catch external content loads (init messages)
3. **Block Handle CSS**: Proper positioning with `position: absolute` and left margin spacing
4. **Outline bar style**: Horizontal bars with width indicating heading level (matching reference screenshot)
5. **ProseMirror drag system**: Block handles use PM native drag (NodeSelection + view.dragging) instead of custom DnD
6. **DOM mutation observer**: Must stop/start PM's MutationObserver when toggling CSS classes on PM-rendered elements
7. **Undo history**: External content updates use `setMeta('addToHistory', false)` to avoid polluting undo stack

### Image System Redesign (M8 - Complete)
The original plan deferred M8. It was later implemented with a complete redesign:
- **ImageNode.ts** — Extension with `width`, `textAlign`, `originalSrc` attributes
- **ImageNodeView.tsx** — React NodeView with 3 states: drop zone, display, selected (resize+popover)
- **ImageDropZone.tsx** — Component for empty images (file drop, URL input, browse button)
- **ImagePopoverToolbar.tsx** — Floating toolbar (alignment, replace, delete)
- **useImageResize.ts** — Hook forked from `tiptap-extension-resize-image` (pointer events, not HTML5 DnD)
- Width/alignment persisted as HTML comments: `<!-- image: width=300 align=center -->`
- VS Code file picker integration (`saveImage`, `requestFilePicker` messages)
- Relative path resolution via `requestImageUrl` / `image-url-resolved` custom events
- `imageAssetsPath` setting for uploaded image directory
- **No Obsidian dimension syntax** — uses standard `![alt](src)` with HTML comment metadata

### Table Controls (Post-Migration - Complete)
Originally listed as "Post-Refactor: Deferred", table controls were fully implemented:
- **Add bars**: Full-width/height pill bars on last row/column for quick table expansion
- **Column widths**: Persisted via `colwidth` attribute, horizontal scroll for wide tables
- **Row grippers**: Left edge, one per body row (header row excluded), drag-to-reorder with drop indicator
- **Column grippers**: Top edge, one per column, drag-to-reorder with drop indicator
- **Context menus**: Right-click on row/column grips for insert/delete operations
- Uses `prosemirror-tables` `addRow`/`addColumn`/`deleteRow`/`deleteColumn` commands
- All implemented in `TableControls.ts` plugin (not React - uses fixed DOM elements)

### UI Polish (Complete)
- Consistent floating menu styles: 12px font, 4px 8px padding, 6px border-radius
- Branding cleanup: removed "Obsidian" and "Notion" references from descriptions and UI
- Settings panel toggle switches use theme variables (not hardcoded green)
- H4 support in slash commands and bubble menu

### Branch
All work is on `feature/react-migration` branch.

---

**Architecture:** Incremental migration in 9 milestones. Each milestone converts a component/extension to React while keeping all E2E tests passing. Uses @tiptap/react for editor integration, React NodeViews for custom nodes, and plain CSS (no Tailwind).

**Tech Stack:** React 18, @tiptap/react ^2.x, esbuild with JSX, plain CSS with VS Code variables

**Base Version:** 0.5.0

---

## First Step: Create Feature Branch

```bash
git checkout -b feature/react-migration
```

All work happens on this single feature branch with incremental commits per milestone.

---

## Critical CSS Selectors (Must Preserve for Tests)

These selectors are used by `tests/utils/editor-helper.ts` and MUST be maintained:

| Selector | Usage | Component |
|----------|-------|-----------|
| `#editor` | Editor container | main entry |
| `.ProseMirror` | Editor content area | Tiptap default |
| `.ProseMirror-focused` | Focus detection | Tiptap default |
| `.slash-command-menu` | Slash menu container | SlashCommand |
| `.slash-command-item` | Menu item | SlashCommand |
| `.slash-command-item.is-selected` | Selected item | SlashCommand |
| `.slash-command-title` | Item title text | SlashCommand |
| `p.is-editor-empty` | Empty placeholder | Tiptap Placeholder |
| `ul[data-type="taskList"]` | Task lists | Tiptap TaskList |
| `tr`, `td`, `th` | Table elements | Tiptap Table |

---

## File Structure After Migration

```
webview/editor/
├── index.tsx                    # NEW: React entry point
├── Editor.tsx                   # NEW: Main React editor component
├── main.ts                      # DELETED after M1
├── components/
│   ├── BubbleMenu.tsx           # CONVERTED from .ts
│   ├── LinkPicker.tsx           # CONVERTED from .ts
│   ├── TableSizePicker.tsx      # CONVERTED from .ts
│   ├── SlashCommandMenu.tsx     # NEW: Extracted from SlashCommand
│   └── DocumentOutline.tsx      # NEW: M7
├── extensions/
│   ├── CustomParagraph.ts       # KEEP (no React needed)
│   ├── KeyboardNavigation.ts    # KEEP (no React needed)
│   ├── SlashCommand.ts          # MODIFIED: Uses React menu
│   ├── ImageNode.tsx            # CONVERTED: React NodeView
│   ├── MermaidNode.tsx          # CONVERTED: React NodeView
│   ├── TableControls.tsx        # CONVERTED: React component
│   └── BubbleMenuExtension.ts   # MODIFIED: Uses React BubbleMenu
├── hooks/
│   └── useVSCodeMessaging.ts    # NEW: Extracted messaging logic
└── styles/
    └── editor.css               # KEEP + ADD new component styles
```

---

## Milestone 1: React Foundation

**Tests that must pass:** `editor-basic.spec.ts`, `editor-formatting.spec.ts`

### Task 1.1: Install React Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install React packages**

Run:
```bash
npm install react@^18 react-dom@^18 @tiptap/react@^2
npm install -D @types/react@^18 @types/react-dom@^18
```

**Step 2: Verify installation**

Run: `npm ls react`
Expected: `react@18.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install React and @tiptap/react dependencies"
```

---

### Task 1.2: Configure esbuild for JSX

**Files:**
- Modify: `esbuild.js:45-65` (webview build section)

**Step 1: Read current esbuild config**

Check the webview entry point configuration around line 45-65.

**Step 2: Add JSX configuration**

Find the webview build config and add:
```javascript
{
  entryPoints: ['webview/editor/index.tsx'],  // Changed from main.ts
  outfile: 'dist/webview/editor.js',
  bundle: true,
  format: 'iife',
  target: 'es2020',
  jsx: 'automatic',  // ADD THIS
  // ... rest of config
}
```

**Step 3: Test build**

Run: `npm run compile`
Expected: Build succeeds (will fail until we create index.tsx)

**Step 4: Commit**

```bash
git add esbuild.js
git commit -m "chore: configure esbuild for React JSX"
```

---

### Task 1.3: Create React Entry Point

**Files:**
- Create: `webview/editor/index.tsx`
- Create: `webview/editor/Editor.tsx`

**Step 1: Create Editor.tsx (React wrapper)**

```tsx
// webview/editor/Editor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef, useCallback } from 'react'

// Keep existing extensions for now (will convert later)
import { CustomParagraph } from './extensions/CustomParagraph'
import { KeyboardNavigation } from './extensions/KeyboardNavigation'
import { SlashCommand } from './extensions/SlashCommand'
import { ImageNode } from './extensions/ImageNode'
import { MermaidNode } from './extensions/MermaidNode'
import { TableControls } from './extensions/TableControls'
import { BubbleMenuExtension } from './extensions/BubbleMenuExtension'

// VS Code API type
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void
      getState: () => unknown
      setState: (state: unknown) => void
    }
  }
}

const vscode = window.vscode

interface EditorProps {
  initialContent?: string
  filename?: string
}

export function Editor({ initialContent = '', filename = 'untitled.md' }: EditorProps) {
  const isUpdatingFromExtension = useRef(false)
  const updateTimeout = useRef<number | null>(null)
  const lastKnownContent = useRef(initialContent)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        paragraph: false,
      }),
      CustomParagraph,
      Placeholder.configure({
        placeholder: 'Start typing, or press / for commands...',
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { class: 'editor-link' },
      }),
      TaskList.configure({
        HTMLAttributes: { class: 'task-list' },
      }),
      TaskItem.configure({
        nested: true,
        onReadOnlyChecked: () => true,
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: { class: 'editor-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableControls,
      ImageNode,
      MermaidNode,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      SlashCommand,
      KeyboardNavigation,
      BubbleMenuExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (isUpdatingFromExtension.current) return

      // Debounce updates
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }

      updateTimeout.current = window.setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown()
        if (markdown !== lastKnownContent.current) {
          lastKnownContent.current = markdown
          vscode.postMessage({ type: 'update', payload: { content: markdown } })
          vscode.setState({ content: markdown })
        }
      }, 150)
    },
  })

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data
      if (!editor) return

      switch (message.type) {
        case 'init':
        case 'update': {
          const content = message.payload.content
          if (content !== lastKnownContent.current) {
            isUpdatingFromExtension.current = true
            lastKnownContent.current = content

            // Parse and set content
            const doc = editor.storage.markdown.parser.parse(content)
            editor.commands.setContent(doc)

            isUpdatingFromExtension.current = false
          }
          break
        }
        // Add other message handlers as we convert components
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [editor])

  // Signal ready
  useEffect(() => {
    vscode.postMessage({ type: 'ready' })
  }, [])

  if (!editor) {
    return null
  }

  return (
    <div id="editor">
      <EditorContent editor={editor} />
    </div>
  )
}
```

**Step 2: Create index.tsx (entry point)**

```tsx
// webview/editor/index.tsx
import { createRoot } from 'react-dom/client'
import { Editor } from './Editor'

// Get VS Code API
const vscode = (window as any).acquireVsCodeApi?.() || (window as any).vscode

// Make vscode available globally
;(window as any).vscode = vscode

// Mount React app
const container = document.getElementById('editor')
if (container) {
  // Clear any existing content
  container.innerHTML = ''

  const root = createRoot(container)
  root.render(<Editor />)
}
```

**Step 3: Update editor.html to support React**

The HTML already has `<div id="editor"></div>` which is what we need.

**Step 4: Run build**

Run: `npm run compile`
Expected: Build succeeds

**Step 5: Run tests**

Run: `npm run test:e2e -- tests/e2e/editor-basic.spec.ts`
Expected: Tests pass

**Step 6: Commit**

```bash
git add webview/editor/index.tsx webview/editor/Editor.tsx
git commit -m "feat: add React entry point and Editor component"
```

---

### Task 1.4: Verify All Basic Tests Pass

**Step 1: Run full basic test suite**

Run: `npm run test:e2e -- tests/e2e/editor-basic.spec.ts tests/e2e/editor-formatting.spec.ts`
Expected: All tests pass

**Step 2: Fix any failures**

If tests fail, check:
- CSS selectors match (`.ProseMirror`, `#editor`)
- Message handling works
- Debouncing is correct (150ms)

**Step 3: Commit milestone**

```bash
git add .
git commit -m "milestone: M1 complete - React foundation working"
```

---

## Milestone 2: SlashCommand as React

**Tests that must pass:** `editor-slash.spec.ts` (21 tests)

### Task 2.1: Extract SlashCommandMenu as React Component

**Files:**
- Create: `webview/editor/components/SlashCommandMenu.tsx`
- Modify: `webview/editor/extensions/SlashCommand.ts`

**Step 1: Create React SlashCommandMenu component**

```tsx
// webview/editor/components/SlashCommandMenu.tsx
import { forwardRef, useEffect, useImperativeHandle, useState, useCallback } from 'react'
import type { Editor, Range } from '@tiptap/core'

export interface SlashCommandItem {
  title: string
  description: string
  icon: string
  searchTerms: string[]
  category?: 'style' | 'lists' | 'blocks' | 'media' | 'templates'
  command: (params: { editor: Editor; range: Range }) => void
}

interface SlashCommandMenuProps {
  items: SlashCommandItem[]
  editor: Editor
  range: Range
  onSelect: (item: SlashCommandItem) => void
  onClose: () => void
}

export interface SlashCommandMenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuRef, SlashCommandMenuProps>(
  ({ items, editor, range, onSelect, onClose }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    // Reset selection when items change
    useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    const selectItem = useCallback((index: number) => {
      const item = items[index]
      if (item) {
        onSelect(item)
      }
    }, [items, onSelect])

    // Keyboard navigation
    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
          return true
        }
        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length)
          return true
        }
        if (event.key === 'Enter') {
          selectItem(selectedIndex)
          return true
        }
        if (event.key === 'Escape') {
          onClose()
          return true
        }
        return false
      },
    }), [items.length, selectedIndex, selectItem, onClose])

    // Group items by category
    const categories = ['style', 'lists', 'blocks', 'media', 'templates'] as const
    const groupedItems = categories.map(cat => ({
      category: cat,
      items: items.filter(item => item.category === cat || (!item.category && cat === 'blocks'))
    })).filter(group => group.items.length > 0)

    let itemIndex = 0

    return (
      <div className="slash-command-menu">
        {groupedItems.map(group => (
          <div key={group.category} className="slash-command-group">
            <div className="slash-command-category">
              {group.category.charAt(0).toUpperCase() + group.category.slice(1)}
            </div>
            {group.items.map(item => {
              const currentIndex = itemIndex++
              return (
                <div
                  key={item.title}
                  className={`slash-command-item ${currentIndex === selectedIndex ? 'is-selected' : ''}`}
                  onClick={() => selectItem(currentIndex)}
                  onMouseEnter={() => setSelectedIndex(currentIndex)}
                >
                  <span className="slash-command-icon">{item.icon}</span>
                  <div className="slash-command-content">
                    <span className="slash-command-title">{item.title}</span>
                    <span className="slash-command-description">{item.description}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }
)

SlashCommandMenu.displayName = 'SlashCommandMenu'
```

**Step 2: Modify SlashCommand extension to use React**

Update `webview/editor/extensions/SlashCommand.ts` to render the React component:

```typescript
// In the suggestion render function:
import { createRoot, Root } from 'react-dom/client'
import { SlashCommandMenu, SlashCommandMenuRef } from '../components/SlashCommandMenu'

// ... in render():
let root: Root | null = null
let menuRef: SlashCommandMenuRef | null = null

return {
  onStart: (props) => {
    const container = document.createElement('div')
    container.className = 'slash-command-container'
    document.body.appendChild(container)

    root = createRoot(container)
    root.render(
      <SlashCommandMenu
        ref={(ref) => { menuRef = ref }}
        items={props.items}
        editor={props.editor}
        range={props.range}
        onSelect={(item) => {
          item.command({ editor: props.editor, range: props.range })
          props.command({ editor: props.editor, range: props.range, item })
        }}
        onClose={() => props.editor.commands.focus()}
      />
    )

    // Position the menu
    updatePosition(props)
  },
  onUpdate: (props) => {
    if (root) {
      root.render(/* same as above with updated props */)
      updatePosition(props)
    }
  },
  onKeyDown: (props) => {
    return menuRef?.onKeyDown(props.event) ?? false
  },
  onExit: () => {
    root?.unmount()
    root = null
    menuRef = null
  },
}
```

**Step 3: Run slash command tests**

Run: `npm run test:e2e -- tests/e2e/editor-slash.spec.ts`
Expected: All 21 tests pass

**Step 4: Commit**

```bash
git add webview/editor/components/SlashCommandMenu.tsx webview/editor/extensions/SlashCommand.ts
git commit -m "feat: convert SlashCommandMenu to React component"
```

---

## Milestone 3: ImageNode as React NodeView

**Tests that must pass:** `editor-images.spec.ts` (33 tests)

### Task 3.1: Create React ImageNodeView

**Files:**
- Create: `webview/editor/extensions/ImageNodeView.tsx`
- Modify: `webview/editor/extensions/ImageNode.ts`

The ImageNode is complex (767 lines). Key features to preserve:
- Obsidian dimension syntax: `![alt|300x200](url)`
- Click-to-edit markdown mode
- URL resolution via VS Code messaging
- Custom undo/redo in edit field

**Step 1: Create ImageNodeView React component**

```tsx
// webview/editor/extensions/ImageNodeView.tsx
import { NodeViewWrapper } from '@tiptap/react'
import { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { useState, useRef, useEffect, useCallback } from 'react'

interface ImageNodeViewProps {
  node: ProseMirrorNode
  updateAttributes: (attrs: Record<string, unknown>) => void
  deleteNode: () => void
  selected: boolean
  editor: any
}

// Helper functions (extracted from original)
function parseAltWithDimensions(alt: string): { alt: string; width?: number; height?: number } {
  const match = alt.match(/^(.+?)\|(\d+)(?:x(\d+))?$/)
  if (match) {
    return {
      alt: match[1],
      width: parseInt(match[2], 10),
      height: match[3] ? parseInt(match[3], 10) : undefined,
    }
  }
  return { alt }
}

function formatAltWithDimensions(alt: string, width?: number, height?: number): string {
  if (width && height) return `${alt}|${width}x${height}`
  if (width) return `${alt}|${width}`
  return alt
}

export function ImageNodeView({ node, updateAttributes, deleteNode, selected, editor }: ImageNodeViewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLSpanElement>(null)
  const undoStack = useRef<string[]>([])
  const redoStack = useRef<string[]>([])

  const { src, originalSrc, alt, width, height } = node.attrs
  const displaySrc = originalSrc || src

  // Generate markdown from current attributes
  const getMarkdown = useCallback(() => {
    const formattedAlt = formatAltWithDimensions(alt || '', width, height)
    return `![${formattedAlt}](${displaySrc})`
  }, [alt, width, height, displaySrc])

  // Enter edit mode
  const enterEditMode = useCallback(() => {
    setEditValue(getMarkdown())
    setIsEditing(true)
    undoStack.current = [getMarkdown()]
    redoStack.current = []
  }, [getMarkdown])

  // Exit edit mode and parse result
  const exitEditMode = useCallback((save: boolean = true) => {
    if (save && inputRef.current) {
      const markdown = inputRef.current.textContent || ''
      const match = markdown.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)

      if (match) {
        const [, altText, newSrc] = match
        const { alt: parsedAlt, width: parsedWidth, height: parsedHeight } = parseAltWithDimensions(altText)

        updateAttributes({
          alt: parsedAlt,
          width: parsedWidth,
          height: parsedHeight,
          originalSrc: newSrc,
          src: newSrc, // Will be updated by URL resolution
        })

        // Request URL resolution if needed
        if (!newSrc.startsWith('http') && !newSrc.startsWith('data:')) {
          window.vscode.postMessage({
            type: 'requestImageUrl',
            payload: { path: newSrc }
          })
        }
      }
    }
    setIsEditing(false)
  }, [updateAttributes])

  // Handle keyboard in edit mode
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      e.preventDefault()
      exitEditMode(e.key === 'Enter')
    }

    // Undo/Redo
    const modifier = e.metaKey || e.ctrlKey
    if (modifier && e.key === 'z' && !e.shiftKey) {
      e.preventDefault()
      if (undoStack.current.length > 1) {
        const current = undoStack.current.pop()!
        redoStack.current.push(current)
        const prev = undoStack.current[undoStack.current.length - 1]
        if (inputRef.current) inputRef.current.textContent = prev
      }
    }
    if (modifier && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault()
      if (redoStack.current.length > 0) {
        const next = redoStack.current.pop()!
        undoStack.current.push(next)
        if (inputRef.current) inputRef.current.textContent = next
      }
    }

    // Delete on backspace when empty
    if (e.key === 'Backspace' && inputRef.current?.textContent === '') {
      e.preventDefault()
      deleteNode()
    }
  }, [exitEditMode, deleteNode])

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Move cursor to end
      const range = document.createRange()
      range.selectNodeContents(inputRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  return (
    <NodeViewWrapper className={`editor-image ${selected ? 'is-selected' : ''}`}>
      {isEditing ? (
        <span
          ref={inputRef}
          className="editor-image-edit"
          contentEditable
          suppressContentEditableWarning
          onKeyDown={handleKeyDown}
          onBlur={() => exitEditMode(true)}
        >
          {editValue}
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          onClick={enterEditMode}
          draggable={false}
        />
      )}
    </NodeViewWrapper>
  )
}
```

**Step 2: Update ImageNode extension to use React NodeView**

```typescript
// webview/editor/extensions/ImageNode.ts
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from './ImageNodeView'

// In the extension:
addNodeView() {
  return ReactNodeViewRenderer(ImageNodeView)
}
```

**Step 3: Run image tests**

Run: `npm run test:e2e -- tests/e2e/editor-images.spec.ts`
Expected: All 33 tests pass

**Step 4: Commit**

```bash
git add webview/editor/extensions/ImageNodeView.tsx webview/editor/extensions/ImageNode.ts
git commit -m "feat: convert ImageNode to React NodeView"
```

---

## Milestone 4: MermaidNode as React NodeView

**Tests that must pass:** `editor-mermaid.spec.ts` (17 tests)

### Task 4.1: Create React MermaidNodeView

Similar to ImageNode, but with:
- Async mermaid rendering
- Theme detection and updates
- View mode toggle (scroll/fit)
- Edit mode with textarea

**[Full implementation details follow same pattern as ImageNode]**

---

## Milestone 5: BubbleMenu as React

**Tests that must pass:** `editor-cursor.spec.ts` (13 tests)

### Task 5.1: Convert BubbleMenu to React Component

Use `@tiptap/react`'s `BubbleMenu` component as wrapper.

---

## Milestone 6: UI Components Integration

**Tests that must pass:** All existing 192 tests

### Task 6.1: Add Tiptap UI Component Primitives

Copy from GitHub repo and convert SCSS to CSS:
- Button
- DropdownMenu
- Popover
- Tooltip

### Task 6.2: Replace LinkPicker with React Component

### Task 6.3: Enhance SlashCommandMenu with Categories

---

## Milestone 7: Block Handles (Drag + Insert Plus)

**Tests to add:** New tests for drag/drop and insert button

### What We're Building

```
┌─────────────────────────────────────────┐
│ [+] [⠿]  Paragraph text here...         │
└─────────────────────────────────────────┘
```

- **Drag handle (⠿)** on left of each block - uses `@tiptap/extension-drag-handle`
- **Plus button (+)** next to drag handle - custom React component, triggers slash command

### Task 7.1: Install Drag Handle Extension

**Files:**
- Modify: `package.json`

**Step 1: Install extension**

```bash
npm install @tiptap/extension-drag-handle
```

**Step 2: Verify installation**

Run: `npm ls @tiptap/extension-drag-handle`
Expected: `@tiptap/extension-drag-handle@2.x.x`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tiptap/extension-drag-handle"
```

---

### Task 7.2: Create BlockHandle React Component

**Files:**
- Create: `webview/editor/components/BlockHandle.tsx`
- Create: `tests/e2e/editor-block-handles.spec.ts`

**Step 1: Write failing test**

```typescript
// tests/e2e/editor-block-handles.spec.ts
import { test, expect } from '@playwright/test'
import { createEditorHelper } from '../utils/editor-helper'

test.describe('Block Handles', () => {
  test('shows drag handle on hover', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Hello World\n\nSome content')

    // Hover over heading
    const heading = page.locator('.ProseMirror h1')
    await heading.hover()

    // Drag handle should appear
    const dragHandle = page.locator('.block-handle-drag')
    await expect(dragHandle).toBeVisible()
  })

  test('shows plus button on hover', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Hello World')

    const heading = page.locator('.ProseMirror h1')
    await heading.hover()

    const plusButton = page.locator('.block-handle-plus')
    await expect(plusButton).toBeVisible()
  })

  test('clicking plus button opens slash menu', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Hello World')

    const heading = page.locator('.ProseMirror h1')
    await heading.hover()

    const plusButton = page.locator('.block-handle-plus')
    await plusButton.click()

    const slashMenu = page.locator('.slash-command-menu')
    await expect(slashMenu).toBeVisible()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- tests/e2e/editor-block-handles.spec.ts`
Expected: FAIL - ".block-handle-drag" not found

**Step 3: Create BlockHandle component**

```tsx
// webview/editor/components/BlockHandle.tsx
import { useEffect, useRef, useState } from 'react'
import type { Editor } from '@tiptap/core'

interface BlockHandleProps {
  editor: Editor
}

export function BlockHandle({ editor }: BlockHandleProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [activeNode, setActiveNode] = useState<Element | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Find the block element under cursor
      const editorEl = document.querySelector('.ProseMirror')
      if (!editorEl) return

      const target = document.elementFromPoint(e.clientX, e.clientY)
      if (!target) return

      // Find closest block node
      const blockNode = target.closest('p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote, pre, .editor-image, .mermaid-wrapper')
      if (!blockNode || !editorEl.contains(blockNode)) {
        setPosition(null)
        setActiveNode(null)
        return
      }

      const rect = blockNode.getBoundingClientRect()
      const editorRect = editorEl.getBoundingClientRect()

      setPosition({
        top: rect.top - editorRect.top,
        left: -40, // Position to left of editor
      })
      setActiveNode(blockNode)
    }

    const handleMouseLeave = () => {
      setPosition(null)
      setActiveNode(null)
    }

    const editorEl = document.querySelector('.ProseMirror')
    editorEl?.addEventListener('mousemove', handleMouseMove)
    editorEl?.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      editorEl?.removeEventListener('mousemove', handleMouseMove)
      editorEl?.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  const handlePlusClick = () => {
    if (!activeNode) return

    // Get ProseMirror position for this DOM node
    const pos = editor.view.posAtDOM(activeNode, 0)

    // Insert empty paragraph and trigger slash command
    editor
      .chain()
      .focus()
      .insertContentAt(pos, { type: 'paragraph' })
      .setTextSelection(pos + 1)
      .run()

    // Trigger slash menu by inserting /
    setTimeout(() => {
      editor.commands.insertContent('/')
    }, 10)
  }

  if (!position) return null

  return (
    <div
      ref={containerRef}
      className="block-handle-container"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
    >
      <button
        className="block-handle-plus"
        onClick={handlePlusClick}
        title="Add block"
        type="button"
      >
        +
      </button>
      <button
        className="block-handle-drag"
        draggable
        title="Drag to move"
        type="button"
      >
        ⠿
      </button>
    </div>
  )
}
```

**Step 4: Add CSS styles**

Add to `webview/editor/styles/editor.css`:

```css
/* Block Handles */
.block-handle-container {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.ProseMirror:hover .block-handle-container {
  opacity: 0.5;
}

.block-handle-container:hover {
  opacity: 1 !important;
}

.block-handle-plus,
.block-handle-drag {
  width: 18px;
  height: 18px;
  border: none;
  background: var(--vscode-editor-background);
  color: var(--vscode-foreground);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  opacity: 0.6;
}

.block-handle-plus:hover,
.block-handle-drag:hover {
  background: var(--vscode-list-hoverBackground);
  opacity: 1;
}

.block-handle-drag {
  cursor: grab;
}

.block-handle-drag:active {
  cursor: grabbing;
}
```

**Step 5: Integrate into Editor.tsx**

Add BlockHandle component to Editor render:

```tsx
// In Editor.tsx
import { BlockHandle } from './components/BlockHandle'

// In return:
return (
  <div id="editor">
    <BlockHandle editor={editor} />
    <EditorContent editor={editor} />
  </div>
)
```

**Step 6: Run tests**

Run: `npm run test:e2e -- tests/e2e/editor-block-handles.spec.ts`
Expected: All tests pass

**Step 7: Commit**

```bash
git add webview/editor/components/BlockHandle.tsx webview/editor/styles/editor.css webview/editor/Editor.tsx tests/e2e/editor-block-handles.spec.ts
git commit -m "feat: add block handles with drag and plus button"
```

---

### Task 7.3: Integrate Drag Handle Extension

**Files:**
- Modify: `webview/editor/Editor.tsx`
- Modify: `webview/editor/components/BlockHandle.tsx`

**Step 1: Add extension to editor**

```tsx
// In Editor.tsx
import DragHandle from '@tiptap/extension-drag-handle'

// In extensions array:
DragHandle.configure({
  render() {
    // Use our custom BlockHandle component for rendering
    return document.createElement('div') // Placeholder - actual render in BlockHandle
  }
})
```

**Step 2: Wire up drag functionality**

Update BlockHandle to use Tiptap's drag handle API for actual drag-and-drop.

**Step 3: Test drag and drop**

Run: `npm run test:e2e -- tests/e2e/editor-block-handles.spec.ts`

**Step 4: Commit milestone**

```bash
git add .
git commit -m "milestone: M7 complete - block handles with drag and plus button"
```

---

## Milestone 8: Enhanced Image Handling

**Tests to add:** New tests for image upload, URL, and resize

### What We're Building

1. **Image upload** - paste/drop → saves to `assets/` directory
2. **Image URL** - paste URL → embeds remote image
3. **Resize handles** - drag corners to resize

### Task 8.1: Install File Handler Extension

**Files:**
- Modify: `package.json`

**Step 1: Install extension**

```bash
npm install @tiptap/extension-file-handler
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tiptap/extension-file-handler"
```

---

### Task 8.2: Add Image Upload Handler

**Files:**
- Modify: `webview/editor/Editor.tsx`
- Modify: `src/editors/MarkdownEditorProvider.ts` (VS Code extension side)
- Create: `tests/e2e/editor-image-upload.spec.ts`

**Step 1: Write failing test**

```typescript
// tests/e2e/editor-image-upload.spec.ts
import { test, expect } from '@playwright/test'
import { createEditorHelper } from '../utils/editor-helper'

test.describe('Image Upload', () => {
  test('paste image creates file in assets directory', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('')

    // Simulate paste with image data
    // (Playwright can simulate clipboard with image data)

    // Verify image node is created
    const imageNode = page.locator('.ProseMirror .editor-image img')
    await expect(imageNode).toBeVisible()

    // Verify src points to assets/
    const src = await imageNode.getAttribute('src')
    expect(src).toContain('assets/')
  })
})
```

**Step 2: Configure FileHandler extension**

```tsx
// In Editor.tsx
import FileHandler from '@tiptap/extension-file-handler'

// In extensions:
FileHandler.configure({
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  onPaste: (editor, files, htmlContent) => {
    files.forEach(file => {
      // Send file to VS Code extension for saving
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        window.vscode.postMessage({
          type: 'saveImage',
          payload: {
            filename: file.name || `image-${Date.now()}.png`,
            data: base64,
          }
        })
      }
      reader.readAsDataURL(file)
    })
  },
  onDrop: (editor, files, pos) => {
    // Same as paste
  }
})
```

**Step 3: Handle message in VS Code extension**

```typescript
// In MarkdownEditorProvider.ts - handleMessage
case 'saveImage': {
  const { filename, data } = message.payload
  const assetsDir = path.join(path.dirname(document.uri.fsPath), 'assets')

  // Create assets directory if needed
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(assetsDir))

  // Save file
  const filePath = path.join(assetsDir, filename)
  const buffer = Buffer.from(data.split(',')[1], 'base64')
  await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), buffer)

  // Send back the path
  webview.postMessage({
    type: 'imageSaved',
    payload: { path: `assets/${filename}` }
  })
  break
}
```

**Step 4: Insert image on save response**

```tsx
// Handle imageSaved message in Editor.tsx
case 'imageSaved': {
  const { path } = message.payload
  editor.chain().focus().setImage({ src: path }).run()
  break
}
```

**Step 5: Run tests**

Run: `npm run test:e2e -- tests/e2e/editor-image-upload.spec.ts`

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add image paste/drop with save to assets/"
```

---

### Task 8.3: Add Image Resize Handles

**Files:**
- Modify: `webview/editor/extensions/ImageNodeView.tsx`
- Modify: `webview/editor/styles/editor.css`

**Step 1: Write failing test**

```typescript
test('image resize handles appear on selection', async ({ page }) => {
  const editor = createEditorHelper(page)
  await editor.load('![test](image.png)')

  const image = page.locator('.editor-image')
  await image.click()

  const resizeHandle = page.locator('.image-resize-handle')
  await expect(resizeHandle).toBeVisible()
})

test('dragging resize handle changes image dimensions', async ({ page }) => {
  const editor = createEditorHelper(page)
  await editor.load('![test](image.png)')

  const image = page.locator('.editor-image img')
  const initialWidth = await image.evaluate(el => el.offsetWidth)

  // Drag resize handle
  const handle = page.locator('.image-resize-handle-se')
  await handle.dragTo(handle, { targetPosition: { x: 50, y: 50 } })

  const newWidth = await image.evaluate(el => el.offsetWidth)
  expect(newWidth).toBeGreaterThan(initialWidth)
})
```

**Step 2: Add resize handles to ImageNodeView**

```tsx
// In ImageNodeView.tsx
export function ImageNodeView({ node, updateAttributes, selected }: ImageNodeViewProps) {
  const [isResizing, setIsResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = imageRef.current?.offsetWidth || 0
    const startHeight = imageRef.current?.offsetHeight || 0

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY

      let newWidth = startWidth
      let newHeight = startHeight

      if (direction.includes('e')) newWidth = startWidth + deltaX
      if (direction.includes('w')) newWidth = startWidth - deltaX
      if (direction.includes('s')) newHeight = startHeight + deltaY
      if (direction.includes('n')) newHeight = startHeight - deltaY

      // Maintain aspect ratio if shift held
      if (moveEvent.shiftKey) {
        const ratio = startWidth / startHeight
        newHeight = newWidth / ratio
      }

      updateAttributes({ width: Math.round(newWidth), height: Math.round(newHeight) })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <NodeViewWrapper className={`editor-image ${selected ? 'is-selected' : ''}`}>
      <div className="image-container">
        <img ref={imageRef} src={src} alt={alt} width={width} height={height} />
        {selected && (
          <>
            <div className="image-resize-handle image-resize-handle-nw" onMouseDown={e => handleResizeStart(e, 'nw')} />
            <div className="image-resize-handle image-resize-handle-ne" onMouseDown={e => handleResizeStart(e, 'ne')} />
            <div className="image-resize-handle image-resize-handle-sw" onMouseDown={e => handleResizeStart(e, 'sw')} />
            <div className="image-resize-handle image-resize-handle-se" onMouseDown={e => handleResizeStart(e, 'se')} />
          </>
        )}
      </div>
    </NodeViewWrapper>
  )
}
```

**Step 3: Add resize handle CSS**

```css
/* Image Resize Handles */
.image-container {
  position: relative;
  display: inline-block;
}

.image-resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--vscode-focusBorder);
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}

.editor-image.is-selected .image-resize-handle {
  opacity: 1;
}

.image-resize-handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
.image-resize-handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
.image-resize-handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
.image-resize-handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
```

**Step 4: Verify Obsidian syntax preserved**

Ensure markdown output still uses `![alt|WIDTHxHEIGHT](src)` format.

**Step 5: Run tests**

Run: `npm run test:e2e -- tests/e2e/editor-images.spec.ts tests/e2e/editor-image-upload.spec.ts`

**Step 6: Commit milestone**

```bash
git add .
git commit -m "milestone: M8 complete - enhanced image handling with upload and resize"
```

---

## Milestone 9: Document Outline Sidebar

**Tests to add:** New tests for outline sidebar

### What We're Building

- Right sidebar showing heading hierarchy
- Click to scroll to heading
- Live updates as you type
- Collapsible (toggle button)

### Task 9.1: Install Table of Contents Extension

**Files:**
- Modify: `package.json`

**Step 1: Install extension**

```bash
npm install @tiptap/extension-table-of-contents
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @tiptap/extension-table-of-contents"
```

---

### Task 9.2: Create DocumentOutline Component

**Files:**
- Create: `webview/editor/components/DocumentOutline.tsx`
- Create: `tests/e2e/editor-outline.spec.ts`

**Step 1: Write failing tests**

```typescript
// tests/e2e/editor-outline.spec.ts
import { test, expect } from '@playwright/test'
import { createEditorHelper } from '../utils/editor-helper'

test.describe('Document Outline', () => {
  test('shows headings in outline', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Title\n\n## Section 1\n\n## Section 2\n\n### Subsection')

    const outline = page.locator('.document-outline')
    await expect(outline).toBeVisible()

    const headings = outline.locator('.outline-item')
    await expect(headings).toHaveCount(4)
  })

  test('clicking outline item scrolls to heading', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Title\n\n' + 'content\n'.repeat(50) + '\n## Bottom Section')

    const outlineItem = page.locator('.outline-item').last()
    await outlineItem.click()

    const heading = page.locator('.ProseMirror h2')
    await expect(heading).toBeInViewport()
  })

  test('outline can be collapsed', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Title')

    const toggleBtn = page.locator('.outline-toggle')
    await toggleBtn.click()

    const outline = page.locator('.document-outline')
    await expect(outline).toHaveClass(/collapsed/)
  })

  test('outline updates as you type', async ({ page }) => {
    const editor = createEditorHelper(page)
    await editor.load('# Initial')

    let headings = page.locator('.outline-item')
    await expect(headings).toHaveCount(1)

    // Type new heading
    await editor.type('\n\n## New Heading')
    await editor.waitForSync()

    headings = page.locator('.outline-item')
    await expect(headings).toHaveCount(2)
  })
})
```

**Step 2: Create DocumentOutline component**

```tsx
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
      const state = window.vscode.getState() || {}
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
```

**Step 3: Add outline CSS**

```css
/* Document Outline */
.document-outline {
  width: 200px;
  border-left: 1px solid var(--vscode-panel-border);
  padding: 12px;
  overflow-y: auto;
  flex-shrink: 0;
}

.document-outline.collapsed {
  width: 40px;
  padding: 12px 8px;
}

.outline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.outline-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vscode-foreground);
  opacity: 0.7;
}

.collapsed .outline-title {
  display: none;
}

.outline-toggle {
  background: none;
  border: none;
  color: var(--vscode-foreground);
  cursor: pointer;
  padding: 4px;
  opacity: 0.6;
}

.outline-toggle:hover {
  opacity: 1;
}

.outline-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.outline-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--vscode-foreground);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.outline-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.outline-level-1 { padding-left: 8px; font-weight: 600; }
.outline-level-2 { padding-left: 16px; }
.outline-level-3 { padding-left: 24px; font-size: 12px; }
.outline-level-4 { padding-left: 32px; font-size: 12px; opacity: 0.8; }
.outline-level-5 { padding-left: 40px; font-size: 11px; opacity: 0.8; }
.outline-level-6 { padding-left: 48px; font-size: 11px; opacity: 0.7; }
```

**Step 4: Update Editor layout**

```tsx
// In Editor.tsx
import { DocumentOutline } from './components/DocumentOutline'

// Update return:
return (
  <div id="editor-container" style={{ display: 'flex' }}>
    <div id="editor" style={{ flex: 1 }}>
      <BlockHandle editor={editor} />
      <EditorContent editor={editor} />
    </div>
    <DocumentOutline editor={editor} />
  </div>
)
```

**Step 5: Run tests**

Run: `npm run test:e2e -- tests/e2e/editor-outline.spec.ts`

**Step 6: Commit milestone**

```bash
git add .
git commit -m "milestone: M9 complete - document outline sidebar"
```

---

## Milestone Summary

| Milestone | Scope | Status |
|-----------|-------|--------|
| **M1** | React foundation + main editor | ✅ Complete |
| **M2** | SlashCommand as React + categories | ✅ Complete |
| **M3** | ImageNode as React NodeView | ✅ Complete |
| **M4** | MermaidNode as React NodeView | ✅ Complete |
| **M5** | BubbleMenu + LinkPicker as React | ✅ Complete |
| **M6** | UI Components integration | ✅ Complete |
| **M7** | Block handles (drag + insert plus) | ✅ Complete |
| **M8** | Image redesign (drop zone, resize, popover, VS Code integration) | ✅ Complete |
| **M9** | Document outline sidebar | ✅ Complete |
| **Table** | Grips, drag-to-reorder, context menus, add bars, column widths | ✅ Complete |
| **Polish** | Menu alignment, branding cleanup, settings theming | ✅ Complete |

---

## Pre-Merge Checklist

- [x] All 277 E2E tests pass
- [ ] No performance regressions
- [x] Dark/light theme works
- [x] All existing features work
- [x] New features work:
  - [x] Block drag handles
  - [x] Insert plus button
  - [x] Image drop zone, resize, popover toolbar
  - [x] Image upload to assets/ via VS Code
  - [x] Document outline sidebar
  - [x] Table grips, drag-to-reorder, context menus
- [x] Documentation updated (README, CHANGELOG, CHECKLIST)
- [ ] Version bumped for release
