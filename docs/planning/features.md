# PM Toolkit - Feature Specification

## Feature Overview

| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| WYSIWYG Markdown Editor | P0 | High | ✅ Complete |
| Slash Command Menu | P0 | Medium | ✅ Complete |
| Kanban Board | P0 | High | ✅ Complete |
| Kanban Column Settings | P1 | Medium | ✅ Complete |
| Kanban Card Modal | P1 | Medium | ✅ Complete |
| PDF Viewer | P1 | Low | ✅ Complete |
| Word Viewer | P1 | Low | ✅ Complete |
| Excel Viewer | P1 | Low | ✅ Complete |
| CSV Viewer | P1 | Low | ✅ Complete |
| Template System | P2 | Medium | ✅ Complete |
| Mermaid Diagrams | P2 | Medium | ✅ Complete |
| Settings Panel | P1 | Medium | ✅ Complete |
| Bubble Menu | P1 | Medium | ✅ Complete |
| Block Handles | P1 | Medium | ✅ Complete |
| Document Outline | P2 | Low | ✅ Complete |
| Image Resize/Popover | P1 | High | ✅ Complete |
| Table Drag-to-Reorder | P1 | High | ✅ Complete |

---

## F1: WYSIWYG Markdown Editor

### Description
Real-time WYSIWYG editing of markdown files with instant formatting preview.

### Requirements

**Core Editing:**
- [ ] Load and save `.md` files
- [ ] Real-time WYSIWYG rendering
- [ ] Support all CommonMark syntax
- [ ] Support GFM (GitHub Flavored Markdown)
- [ ] Undo/redo with Cmd/Ctrl+Z
- [ ] Copy/paste with formatting preservation

**Text Formatting:**
- [ ] Bold (`**text**`)
- [ ] Italic (`*text*`)
- [ ] Strikethrough (`~~text~~`)
- [ ] Inline code (`` `code` ``)
- [ ] Links (`[text](url)`)

**Block Elements:**
- [ ] Headings (H1-H6)
- [ ] Paragraphs
- [ ] Blockquotes
- [ ] Code blocks with syntax highlighting
- [ ] Horizontal rules

**Lists:**
- [ ] Bullet lists
- [ ] Numbered lists
- [ ] Checkbox/task lists
- [ ] Nested lists
- [ ] Tab/Shift+Tab for indent/outdent

**Tables:**
- [ ] Create tables via slash command
- [ ] Add/remove rows and columns
- [ ] Column alignment (left/center/right)
- [ ] Context menu for table operations

**Theme:**
- [ ] Match VS Code theme (dark/light)
- [ ] Auto-switch on theme change

### Acceptance Criteria
1. User can open a `.md` file and see formatted content
2. Typing updates the file in real-time
3. All standard markdown syntax renders correctly
4. External file changes (git, other editors) sync to the view

---

## F2: Slash Command Menu

### Description
Notion-style `/` command palette for quick block insertion.

### Requirements

- [ ] Trigger on `/` at start of line or after whitespace
- [ ] Show searchable command list
- [ ] Keyboard navigation (Arrow up/down, Enter, Escape)
- [ ] Click to select
- [ ] Filter as user types
- [ ] Position near cursor, flip if near edges

### Default Commands

| Command | Shortcut | Output |
|---------|----------|--------|
| Text | /text | Plain paragraph |
| Heading 1 | /h1 | `# ` |
| Heading 2 | /h2 | `## ` |
| Heading 3 | /h3 | `### ` |
| Bullet List | /bullet | `- ` |
| Numbered List | /numbered | `1. ` |
| Checkbox | /checkbox, /todo | `- [ ] ` |
| Quote | /quote | `> ` |
| Code Block | /code | ``` block |
| Table | /table | Size picker, then table |
| Divider | /divider | `---` |
| Diagram | /diagram, /mermaid | Mermaid template |

### Acceptance Criteria
1. Typing `/` shows the menu
2. Typing filters the list
3. Enter inserts selected command
4. Escape closes without action
5. Commands appear from templates when configured

---

## F3: Kanban Board

### Description
Visual task board that reads/writes standard markdown checkbox syntax.

### Markdown Format

```markdown
## Column Name

- [ ] Task one
- [ ] Task two
  Additional description

## Another Column

- [x] Completed task
```

### Requirements

**Display:**
- [x] Parse markdown into board structure
- [x] Render columns from `## ` headings
- [x] Render cards from `- [ ]` items
- [x] Show completion state (checkbox)
- [x] Show task count per column
- [x] Support multi-line task descriptions
- [x] Card thumbnails (first image from description)

**Interactions:**
- [x] Drag cards between columns
- [x] Drag to reorder within column
- [x] Click checkbox to toggle completion
- [x] Click card to open detail modal
- [x] Add new task button per column
- [x] Delete task button
- [x] Archive task (move to Archive column)

**Column Settings:**
- [x] Kebab menu dropdown on column headers
- [x] Auto-complete toggle per column (`[auto-complete]`)
- [x] Settings persist in markdown syntax

**Card Modal:**
- [x] Linear-style modal overlay
- [x] Click-to-edit card title
- [x] Tiptap WYSIWYG editor for description
- [x] Image support with copy/paste
- [x] Auto-save on close

**Board Settings:**
- [x] Toggle thumbnails (`[no-thumbnails]` in preamble)
- [x] VS Code menu command for thumbnail toggle

**Auto-behaviors:**
- [x] Moving to column with [auto-complete] marks complete
- [x] Archive column hidden when empty

**Sync:**
- [x] Changes write back to markdown file
- [x] External changes update the board
- [x] Debounce updates (150ms)

### File Types
- `.kanban` files open as board by default
- `.md` files can "Open as Kanban" via context menu

### Markdown Format (Updated)

```markdown
[no-thumbnails]

## To Do

- [ ] Task with description
  Description text here
  ![image](./path/to/image.png)

## In Progress

## Done [auto-complete]
```

### Acceptance Criteria
1. ✅ Opening a `.kanban` file shows the board
2. ✅ Dragging a card updates the markdown
3. ✅ Completing a task updates the checkbox
4. ✅ Board survives round-trip (md → board → md)
5. ✅ Clicking card opens detail modal
6. ✅ Column settings persist in markdown

---

## F4: PDF Viewer

### Description
Read-only PDF viewing within VS Code.

### Requirements

- [ ] Render PDF pages as images
- [ ] Page navigation (prev/next, page input)
- [ ] Zoom controls (in/out, fit width, fit page)
- [ ] Current page / total pages display
- [ ] Scroll through pages
- [ ] Rotation controls

### Acceptance Criteria
1. Opening a `.pdf` shows the document
2. All pages are viewable
3. Zoom works smoothly
4. Large PDFs don't freeze the editor

---

## F5: Word Viewer

### Description
Read-only `.docx` viewing within VS Code.

### Requirements

- [ ] Convert DOCX to styled HTML
- [ ] Preserve basic formatting (bold, italic, lists)
- [ ] Preserve headings
- [ ] Show images (embedded)
- [ ] Zoom controls

### Limitations (acceptable)
- Complex layouts may not render perfectly
- Embedded objects may not display
- This is for quick reference, not full fidelity

### Acceptance Criteria
1. Opening a `.docx` shows readable content
2. Basic formatting is preserved
3. Document is scrollable

---

## F6: Excel Viewer

### Description
Read-only `.xlsx` viewing within VS Code.

### Requirements

- [ ] Parse Excel workbook
- [ ] Sheet tabs for multi-sheet workbooks
- [ ] Render cells as HTML table
- [ ] Column headers (A, B, C...)
- [ ] Row numbers
- [ ] Basic cell formatting (numbers, dates)
- [ ] Zoom controls

### Acceptance Criteria
1. Opening a `.xlsx` shows spreadsheet
2. Can switch between sheets
3. Data is readable and aligned

---

## F7: CSV Viewer

### Description
Read-only CSV/TSV viewing with sorting.

### Requirements

- [ ] Parse CSV with Papa Parse
- [ ] Auto-detect delimiter (comma, semicolon, tab, pipe)
- [ ] Manual delimiter override
- [ ] Header row toggle
- [ ] Sortable columns (click header)
- [ ] Row count display
- [ ] Zoom controls

### Acceptance Criteria
1. Opening a `.csv` shows tabular data
2. Columns are sortable
3. Different delimiters work correctly

---

## F8: Template System ✅

### Description
Reusable content blocks inserted via slash menu.

### Requirements

- [x] Configure template folder in settings
- [x] Scan folder for `.md` files
- [x] Parse YAML frontmatter for metadata
- [x] Show templates in slash menu
- [x] Insert template content at cursor
- [x] Replace variables on insert

### Template Format

```markdown
---
template_name: "Meeting Notes"
template_description: "For team meetings"
template_icon: "calendar"
---

# Meeting: {{date}}

## Attendees
-

## Notes

## Action Items
- [ ]
```

### Variables

| Variable | Replacement |
|----------|-------------|
| `{{date}}` | 2024-01-15 |
| `{{time}}` | 14:30:00 |
| `{{datetime}}` | 2024-01-15 14:30:00 |
| `{{year}}` | 2024 |
| `{{month}}` | 01 |
| `{{day}}` | 15 |

### Acceptance Criteria
1. Templates appear in slash menu
2. Selecting inserts content with variables replaced
3. Adding new template files updates the menu

---

## F9: Mermaid Diagrams

### Description
Render Mermaid diagram code blocks as interactive diagrams.

### Requirements

- [x] Detect ```mermaid code blocks
- [x] Render diagram inline
- [x] View mode toggle (scroll/fit)
- [x] Scroll large diagrams in scroll mode
- [x] Theme-aware colors (dark/light)
- [x] Edit code button with dedicated toolbar
- [x] Keyboard navigation (Enter/ArrowDown after diagram)

### Supported Diagram Types
- Flowchart
- Sequence diagram
- Class diagram
- State diagram
- Gantt chart
- Pie chart

### Acceptance Criteria
1. ✅ Mermaid blocks render as diagrams
2. ✅ Diagrams update on code change
3. ✅ Scroll/fit modes work correctly
4. ✅ Edit button opens code editor
5. ✅ E2E tests pass (17 tests)

---

## F10: Document Outline ✅

### Description
Document outline showing heading structure.

### Requirements

- [x] Extract H1-H6 headings
- [x] Horizontal bar style with width indicating heading level
- [x] Click to scroll to heading
- [x] Update on content change (via transaction listener)

### Acceptance Criteria
1. ✅ Outline shows document structure
2. ✅ Clicking navigates to heading
3. ✅ Updates in real-time as you type

---

## F11: Bubble Menu ✅

### Description
Floating toolbar on text selection for quick formatting.

### Requirements

- [x] Block type dropdown (Text, H1-H3, lists, quote, code block)
- [x] Formatting buttons: Bold, Italic, Strikethrough, Inline code
- [x] Link button with file picker and URL form

---

## F12: Block Handles ✅

### Description
Drag handle and plus button in the editor gutter for each block.

### Requirements

- [x] Drag handle (⠿) for reordering blocks via ProseMirror native drag
- [x] Plus button (+) for inserting new blocks via slash command
- [x] Show on hover, positioned in editor padding zone

---

## F13: Image System ✅

### Description
Full image management with drop zone, resize, alignment, and VS Code integration.

### Requirements

- [x] Drop zone for empty images (file drop, URL input, browse button)
- [x] Resize handles with pointer-event-based dragging
- [x] Popover toolbar for alignment (left/center/right), replace, delete
- [x] Image captions with toggle
- [x] Width/alignment persisted as HTML comments in markdown
- [x] VS Code file picker integration (saveImage, requestFilePicker)
- [x] Relative path resolution via requestImageUrl
- [x] `imageAssetsPath` setting

---

## F14: Table Controls ✅

### Description
Visual controls for table manipulation.

### Requirements

- [x] Full-width/height pill bars for adding rows/columns
- [x] Persisted column widths with horizontal scroll
- [x] Row grippers for drag-to-reorder (skip header)
- [x] Column grippers for drag-to-reorder
- [x] Drop indicator lines during drag
- [x] Right-click context menus on grippers (insert/delete row/column)
