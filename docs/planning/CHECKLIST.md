# PM Toolkit - Implementation Checklist

> **Last Updated**: 2026-02-06
> **Current Version**: 0.5.0 (React migration branch)
> **Current Phase**: Phase 11 Complete (Table Controls & Image Redesign)

This checklist tracks all implementation tasks. Update status as work progresses.

**Status Legend:**
- ⬜ Not Started
- 🟡 In Progress
- ✅ Complete
- ⏸️ Blocked
- ❌ Cancelled

---

## Phase 0: Project Setup

### Git & Repository
- [x] Initialize git repository
- [x] Create .gitignore
- [x] Create implementation checklist (this file)
- [x] Initial commit with planning docs

### Planning Documentation
- [x] architecture.md - System architecture
- [x] tech-stack.md - Technology decisions
- [x] features.md - Feature specifications
- [x] testing-plan.md - QA/Testing strategy
- [x] CHECKLIST.md - Implementation tracking

---

## Phase 1: Foundation

### 1.1 Project Scaffolding
- [x] Create package.json with all dependencies
- [x] Create tsconfig.json (extension - Node.js)
- [x] Create tsconfig.webview.json (webview - browser)
- [x] Create esbuild.js build script
- [x] Create directory structure per architecture.md
- [ ] Add .eslintrc.json (skipped - not needed yet)
- [ ] Add .prettierrc (skipped - not needed yet)
- [x] Verify `npm install` works
- [x] Verify `npm run compile` works

### 1.2 VS Code Extension Boilerplate
- [x] Create src/extension.ts (main entry)
- [x] Create src/types/index.ts (shared types)
- [x] Create src/editors/HTMLBuilder.ts
- [x] Create src/editors/MarkdownEditorProvider.ts (stub)
- [x] Create src/editors/KanbanEditorProvider.ts (stub)
- [x] Register custom editors in package.json
- [x] Test extension loads in Extension Host

### 1.3 Development Workflow
- [x] Create .vscode/launch.json
- [x] Create .vscode/tasks.json
- [x] Create .vscode/extensions.json
- [x] Verify F5 debugging works
- [x] Verify watch mode works

### 1.4 Webview Stubs
- [x] Create webview/editor/main.ts (stub)
- [x] Create webview/editor/styles/editor.css (stub)
- [x] Create webview/kanban/main.ts (stub)
- [x] Create webview/kanban/styles/kanban.css (stub)
- [x] Verify webview loads in custom editor

**Phase 1 Commit Checkpoints:**
- [x] `feat: project scaffolding and build config`
- [x] `feat: VS Code extension boilerplate`
- [x] `feat: webview stubs and dev workflow`

---

## Phase 2: Markdown Editor

### 2.1 Tiptap Setup
- [x] Install Tiptap packages
- [x] Create basic editor initialization
- [x] Configure StarterKit extension
- [x] Add Placeholder extension
- [x] Verify editor renders in webview

### 2.2 Markdown Import/Export
- [x] Install tiptap-markdown
- [x] Configure markdown serialization
- [x] Test markdown → editor → markdown round-trip
- [x] Handle GFM tables
- [x] Handle task lists

### 2.3 Extension ↔ Webview Communication
- [x] Implement message protocol types
- [x] Handle 'init' message (load content)
- [x] Handle 'update' message (content changed)
- [x] Handle external file changes
- [x] Prevent feedback loops
- [x] Add debouncing (150ms)

### 2.4 Theme Integration
- [x] Create theme.css with VS Code variables
- [x] Style headings, paragraphs, lists
- [x] Style code blocks, blockquotes
- [x] Style links, tables
- [x] Test light/dark theme switching (uses VS Code CSS variables)

### 2.5 Table Editing
- [x] Install @tiptap/extension-table packages
- [x] Configure table extension
- [x] Add Tab/Shift+Tab navigation
- [x] Create table context menu (via grip handles in Phase 11)
- [x] Test table markdown serialization

**Phase 2 Commit Checkpoints:**
- [x] `feat: Tiptap editor with markdown support`
- [x] `feat: extension-webview communication`
- [x] `feat: theme integration and styling`
- [x] `feat: table editing support`

---

## Phase 3: Slash Commands

### 3.1 Suggestion Plugin Setup
- [x] Install @tiptap/suggestion
- [x] Create SlashCommand.ts extension
- [x] Trigger on `/` character
- [x] Basic popup rendering

### 3.2 Command Menu UI
- [x] Create SlashCommandMenu.ts component
- [x] Style with VS Code variables
- [x] Keyboard navigation (up/down/enter/escape)
- [x] Filter as user types
- [x] Position near cursor (flip if near edges)

### 3.3 Built-in Commands
- [x] Text (paragraph)
- [x] Heading 1, 2, 3
- [x] Bullet list
- [x] Numbered list
- [x] Checkbox/task
- [x] Quote
- [x] Code block
- [x] Divider
- [x] Table (with size picker)

### 3.4 Table Size Picker
- [x] Create TableSizePicker.ts component
- [x] Grid UI for selecting rows x columns
- [x] Insert table on selection

**Phase 3 Commit Checkpoints:**
- [x] `feat: slash command extension`
- [x] `feat: command menu UI with keyboard nav`
- [x] `feat: built-in slash commands`

---

## Phase 4: Kanban Board

### 4.1 Markdown Parser
- [x] Create parser.ts with parseMarkdown()
- [x] Create serializeBoard()
- [x] Handle ## headings as columns
- [x] Handle - [ ] items as cards
- [x] Handle indented descriptions
- [x] Preserve preamble content
- [x] Test round-trip fidelity

### 4.2 State Management
- [x] Create state.ts with BoardStateManager (in parser.ts)
- [x] Implement LOAD action
- [x] Implement MOVE_CARD action
- [x] Implement TOGGLE_CARD action
- [x] Implement ADD_CARD action
- [x] Implement DELETE_CARD action
- [x] Implement UPDATE_CARD action
- [x] Debounced sync to extension (150ms)

### 4.3 dnd-kit Integration
- [x] Install @dnd-kit/dom
- [x] Create dnd.ts with DragDropManager setup
- [x] Register sortables for cards
- [x] Handle drag-end events
- [x] Test cross-column drag

### 4.4 UI Components
- [x] Create Board.ts component (in ui.ts)
- [x] Create Column.ts component (in ui.ts)
- [x] Create Card.ts component (in ui.ts)
- [x] Card checkbox toggle
- [x] Card double-click to edit
- [x] Card delete button
- [x] Add task button per column

### 4.5 Auto-behaviors
- [x] Auto-complete on move to Done column
- [x] Auto-complete on move to Archive column
- [x] Hide Archive column when empty
- [x] Show task count per column

### 4.6 Styling
- [x] Create kanban.css
- [x] Style with VS Code variables
- [x] Drag state styling
- [x] Edit mode styling

**Phase 4 Commit Checkpoints:**
- [x] `feat: Kanban board with drag-and-drop` (combined all)

---

## Phase 4.5: Kanban Enhancements

### 4.5.1 Column Settings
- [x] Add Lucide icons dependency
- [x] Create icons.ts with SVG icon helpers
- [x] Add ColumnSettings interface (autoComplete)
- [x] Parse [auto-complete] from column titles
- [x] Serialize column settings back to markdown
- [x] Update moveCard() to use column settings

### 4.5.2 Kebab Menu
- [x] Create menu.ts with ColumnMenu class
- [x] Dropdown menu UI with VS Code styling
- [x] "Auto-complete items" toggle with checkmark
- [x] Close on outside click or Escape
- [x] Add kebab button to column headers

### 4.5.3 Card Detail Modal
- [x] Create modal.ts with CardModal class
- [x] Linear-style modal overlay
- [x] Click-to-edit card title
- [x] Tiptap editor for description (tiptap-editor.ts)
- [x] Reuse ImageNode from main editor
- [x] Auto-save description on close

### 4.5.4 Card Thumbnails
- [x] Extract first image from card description
- [x] Render thumbnail on card preview
- [x] Add BoardSettings interface (showThumbnails)
- [x] Parse [no-thumbnails] from document preamble
- [x] VS Code menu command to toggle thumbnails
- [x] Pass board settings through render chain

### 4.5.5 Clipboard Support
- [x] Add requestClipboard handler to KanbanEditorProvider
- [x] Add copyToClipboard handler to KanbanEditorProvider
- [x] Add clipboardData handler to kanban webview
- [x] Image copy/paste works in card modal

### 4.5.6 Bug Fixes
- [x] Image serialization: ensureNewLine() before/after images
- [x] Heading escaping: Enable all levels [1-6] in card editor
- [x] Markdown stripping: Match headers anywhere, handle escapes
- [x] stripMarkdown() for clean card previews

**Phase 4.5 Commit Checkpoints:**
- [x] `feat: add kanban column settings, card modal, and thumbnails`
- [x] `fix: improve image serialization and markdown stripping for cards`
- [x] `feat: add VS Code menu command to toggle card thumbnails`
- [x] `feat: add clipboard support to kanban card modal`

---

## Phase 5: File Viewers

### 5.1 Base Infrastructure
- [x] Common viewer.css for all viewers
- [x] CSP configuration in each provider
- [x] Zoom controls pattern

### 5.2 PDF Viewer
- [x] Create PDFViewerProvider.ts
- [x] Create pdf-viewer.ts webview
- [x] PDF.js integration (bundled)
- [x] Page navigation
- [x] Zoom controls
- [x] Rotation controls
- [x] Test with various PDFs (manual testing in VS Code)

### 5.3 Word Viewer
- [x] Create DocxViewerProvider.ts
- [x] Create docx-viewer.ts webview
- [x] Mammoth.js integration
- [x] Style HTML output
- [x] Handle embedded images
- [x] Test with various DOCX files (manual testing in VS Code)

### 5.4 Excel Viewer
- [x] Create ExcelViewerProvider.ts
- [x] Create excel-viewer.ts webview
- [x] SheetJS integration (bundled)
- [x] Sheet tabs UI
- [x] Column/row headers
- [x] Cell formatting
- [x] Test with various XLSX files (manual testing in VS Code)

### 5.5 CSV Viewer
- [x] Create CSVViewerProvider.ts
- [x] Create csv-viewer.ts webview
- [x] Papa Parse integration
- [x] Auto-detect delimiter
- [x] Manual delimiter override
- [x] Header row toggle
- [x] Sortable columns
- [x] Test with various CSV/TSV files (test files added)

**Phase 5 Commit Checkpoints:**
- [x] `feat: File viewers (PDF, Word, Excel, CSV)` (combined all)

---

## Phase 6: Templates ✅

### 6.1 Template Manager
- [x] Create TemplateManager.ts
- [x] Install gray-matter
- [x] Folder scanning logic
- [x] YAML frontmatter parsing
- [x] Template caching

### 6.2 Variable System
- [x] Create TemplateVariables.ts
- [x] Implement {{date}} variable
- [x] Implement {{time}} variable
- [x] Implement {{datetime}} variable
- [x] Implement {{year}}, {{month}}, {{day}}

### 6.3 File Watcher
- [x] Set up FileSystemWatcher
- [x] Cache invalidation on changes
- [x] Notify webviews of template updates

### 6.4 Slash Menu Integration
- [x] Add template category to slash menu
- [x] Handle template selection
- [x] Request content from extension
- [x] Insert resolved content

### 6.5 Settings
- [x] Add pmtoolkit.templateFolder setting
- [x] Add pmtoolkit.templateWatchEnabled setting
- [x] Settings change listener
- [x] Add setTemplateFolder command with folder picker dialog

**Phase 6 Commit Checkpoints:**
- [x] `feat: template manager with YAML parsing`
- [x] `feat: template variables`
- [x] `feat: template slash menu integration`
- [x] `feat: add setTemplateFolder command with folder picker`

---

## Phase 7: Mermaid Diagrams ✅

### 7.1 Mermaid Extension
- [x] Create MermaidNode.ts Tiptap extension
- [x] Node schema definition
- [x] parseHTML / renderHTML
- [x] Editor commands (insertMermaid)

### 7.2 Node View
- [x] Create MermaidNodeView.ts
- [x] DOM structure with toolbar
- [x] Mermaid.js rendering
- [x] Error handling for invalid syntax

### 7.3 Interactions
- [x] Zoom controls (buttons + wheel)
- [x] Pan support (drag)
- [x] Edit/preview toggle
- [x] Debounced re-rendering

### 7.4 Theme Integration
- [x] Detect VS Code theme
- [x] Configure Mermaid theme
- [x] Re-render on theme change
- [x] Style mermaid.css

### 7.5 Slash Commands
- [x] Add /diagram command (flowchart)
- [x] Add /sequence command
- [x] Add /class command
- [x] Add /gantt command

### 7.6 Bug Fixes
- [x] Mermaid preprocessing to preserve newlines (tiptap-markdown was stripping them)
- [x] Register MermaidNode extension in main.ts

**Phase 7 Commit Checkpoints:**
- [x] `feat: Mermaid Tiptap extension`
- [x] `feat: Mermaid node view with interactions`
- [x] `feat: Mermaid theme integration`
- [x] `feat: Mermaid slash commands`
- [x] `fix: mermaid newline preservation`

---

## Phase 7.5: Editor Enhancements ✅

### 7.5.1 Code Block Navigation
- [x] Detect cursor position in code blocks
- [x] ArrowUp at start exits above code block
- [x] ArrowDown at end exits below code block
- [x] Cmd+Enter inserts paragraph below and exits

### 7.5.2 Table Navigation Enhancement
- [x] Cmd+Enter in table inserts paragraph below and exits
- [x] Tab/Shift+Tab navigation (from Phase 2)

### 7.5.3 UI Polish
- [x] View Source icon changed to 3-line style (`$(list-flat)`)
- [x] SemVer versioning (switched from CalVer)

**Phase 7.5 Commit Checkpoints:**
- [x] `feat: keyboard navigation for code blocks and tables`
- [x] `chore: update View Source icon`

---

## Phase 8: Settings Panel ✅

### 8.1 Settings Panel UI
- [x] Create `src/settings/SettingsPanel.ts`
- [x] WebviewPanel with inline HTML/CSS/JS
- [x] Card-based section layout (Editor, Templates, Kanban, Support)
- [x] Match Cursor's settings UI aesthetic
- [x] Toggle switches (theme-variable styling)
- [x] VS Code CSS variable theming

### 8.2 New Configuration Options
- [x] `pmtoolkit.editorFontSize` (10-24px, default: 14)
- [x] `pmtoolkit.kanbanDefaultColumns` (default: "Backlog, In Progress, Done")
- [x] `pmtoolkit.kanbanShowThumbnails` (default: true)
- [x] `pmtoolkit.kanbanSaveDelay` (50-2000ms, default: 150)

### 8.3 Menu Integration
- [x] Command: `pmtoolkit.openSettings` ("PM Toolkit Settings")
- [x] Add to `editor/title` overflow menu (group: 2_settings)
- [x] Keep View Source icon in `editor/title/run` (single command = icon)
- [x] Input validation for number ranges

### 8.4 Settings Panel Tests
- [x] Create `tests/harness/settings-harness.html`
- [x] Add `/settings` route to test server
- [x] 22 E2E tests for settings panel
- [x] Layout and content tests
- [x] Input control and toggle tests
- [x] Message passing tests
- [x] Input validation tests

**Phase 8 Commit Checkpoints:**
- [x] `feat: add settings panel with template configuration`
- [x] `feat: improve settings panel and editor title menu`
- [x] `test: add settings panel E2E tests and fix flaky test`

---

## Phase 9: Testing Infrastructure ✅

### 9.1 E2E Test Harness
- [x] Install Playwright
- [x] Create test harness server (`tests/harness/serve.ts`)
- [x] Create editor harness HTML with VS Code mock
- [x] Create settings harness HTML
- [x] EditorHelper page object (`tests/utils/editor-helper.ts`)

### 9.2 Editor Tests
- [x] Basic editor loading and content
- [x] Cursor positioning and movement
- [x] Text formatting (bold, italic, code, etc.)
- [x] Images (rendering, editing, deletion)
- [x] Lists (bullet, numbered, task, indent/outdent)
- [x] Mermaid diagrams
- [x] Slash commands
- [x] State persistence
- [x] Tables
- [x] Undo/redo
- [x] Common workflows
- [x] Code block keyboard navigation

### 9.3 Settings Panel Tests (22 tests)
- [x] Layout and content display
- [x] Editor settings controls
- [x] Template settings controls
- [x] Kanban settings controls
- [x] Support section
- [x] Input validation

### 9.4 CI/CD (Pending)
- [ ] Create .github/workflows/ci.yml
- [ ] Create .github/workflows/release.yml
- [ ] Pre-commit hooks

**Phase 9 Status:**
- 277 total tests (277 passing, 0 failed)

**Phase 9 Commit Checkpoints:**
- [x] `test: add settings panel E2E tests and fix flaky test`
- [ ] `ci: GitHub Actions workflows`

---

## Phase 9.5: Bubble Menu & Links (v0.5.0) ✅

### 9.5.1 Bubble Menu
- [x] Floating toolbar on text selection
- [x] Block type dropdown (Text, H1-H3, lists, quote, code block)
- [x] Formatting buttons: Bold, Italic, Strikethrough, Inline code
- [x] Link button with file picker and URL form

### 9.5.2 Link Slash Command
- [x] `/link` command for inserting links to workspace files or URLs

**Phase 9.5 Commit Checkpoints:**
- [x] `feat: bubble menu with formatting and block type dropdown`
- [x] `feat: link slash command`

---

## Phase 10.5: React Migration ✅

### 10.5.1 Foundation
- [x] Install React and @tiptap/react dependencies
- [x] Configure esbuild for React JSX
- [x] Create `webview/editor/Editor.tsx` React entry point

### 10.5.2 Component Migration
- [x] Migrate SlashCommand menu to React component
- [x] Migrate ImageNode to React NodeView renderer
- [x] Migrate MermaidNode to React NodeView renderer
- [x] Create BlockHandle React component
- [x] Create DocumentOutline React component

### 10.5.3 Bug Fixes
- [x] Fix undo history pollution from external content updates
- [x] Fix mermaid edit mode triggering on click
- [x] Fix slash command menu visibility in E2E tests
- [x] Fix editor ready signal timing

**Phase 10.5 Commit Checkpoints:**
- [x] `feat: add React-based editor component with Tiptap integration`
- [x] `feat: migrate SlashCommand, ImageNode, MermaidNode to React`
- [x] `feat: add BlockHandle and DocumentOutline components`

---

## Phase 11: Image Redesign & Table Controls ✅

### 11.1 Image System Redesign
- [x] `ImageNode.ts` — Extension with `width`, `textAlign`, `originalSrc` attributes
- [x] `ImageNodeView.tsx` — React NodeView with 3 states (drop zone, display, selected)
- [x] `ImageDropZone.tsx` — File drop, URL input, browse button
- [x] `ImagePopoverToolbar.tsx` — Floating toolbar (alignment, replace, delete)
- [x] `useImageResize.ts` — Pointer-event-based resize handles
- [x] Image captions with toggle
- [x] Width/alignment persisted as HTML comments in markdown
- [x] VS Code file picker integration (`saveImage`, `requestFilePicker`)
- [x] Relative path resolution via `requestImageUrl` / `image-url-resolved`
- [x] `imageAssetsPath` setting for uploaded image directory

### 11.2 Table Controls
- [x] Full-width/height pill bars for adding rows/columns
- [x] Persisted column widths with horizontal scroll
- [x] Row grippers (left edge) for drag-to-reorder
- [x] Column grippers (top edge) for drag-to-reorder
- [x] Drop indicator lines during drag
- [x] Right-click context menus on grippers (insert/delete row/column)
- [x] Add bars only visible on last row/column hover

### 11.3 UI Polish
- [x] Consistent floating menu styles (12px font, 4px 8px padding, 6px radius)
- [x] Branding cleanup (removed "Obsidian" and "Notion" references)
- [x] Settings panel toggle switches use theme variables
- [x] Block handle drag-and-drop with ProseMirror native drag system
- [x] H4 support in slash commands and bubble menu

### 11.4 E2E Tests
- [x] Image rendering, deletion, and local image tests
- [x] Image serialization (standard markdown, metadata comments, round-trip)
- [x] Image VS Code handler tests (saveImage, requestFilePicker, requestImageUrl)
- [x] Table controls tests (grippers, context menus, drag-to-reorder)
- [x] Settings panel branding tests
- [x] Total: 277 tests passing

**Phase 11 Commit Checkpoints:**
- [x] `feat: redesign image system with drop zone, resize, popover toolbar`
- [x] `feat: add table row/column drag-to-reorder grippers`
- [x] `feat: add table grip context menu with row/column operations`
- [x] `fix: tighten and align all floating menu styles`
- [x] `test: fix and add comprehensive E2E tests, update branding`

---

## Phase 12: Polish & Release

### 12.1 Documentation
- [x] Update README.md
- [x] Add CHANGELOG.md
- [ ] Add CONTRIBUTING.md
- [x] Add LICENSE (MIT)

### 12.2 Accessibility
- [ ] Keyboard navigation audit
- [ ] Screen reader testing
- [ ] Focus indicator styling
- [ ] ARIA labels

### 12.3 Performance
- [ ] Large file handling
- [ ] Lazy loading optimization
- [ ] Bundle size analysis
- [ ] Memory leak testing

### 12.4 Cross-platform Testing
- [ ] Windows testing
- [x] macOS testing
- [ ] Linux testing

### 12.5 Release
- [x] SemVer versioning (v0.5.0)
- [ ] VS Code Marketplace submission
- [ ] Open VSX submission
- [ ] Release announcement

**Phase 12 Commit Checkpoints:**
- [x] `docs: README and documentation`
- [ ] `a11y: accessibility improvements`
- [ ] `perf: performance optimizations`
- [ ] `chore: release preparation`

---

## Commit Log

| Date | Commit | Description |
|------|--------|-------------|
| 2026-01-29 | `58711d8` | Initial commit |
| 2026-01-29 | `c8cb07f` | feat: Phase 1 - project scaffolding and extension boilerplate |
| 2026-01-29 | `dd24e0c` | feat: Tiptap WYSIWYG markdown editor |
| 2026-01-29 | `e760f50` | feat: Notion-style slash command menu |
| 2026-01-29 | `308d7c4` | docs: update checklist with Phase 2/3 progress |
| 2026-01-29 | `d2426fb` | feat: Kanban board with drag-and-drop |
| 2026-01-29 | `c80a55d` | docs: update checklist with Phase 4 progress |
| 2026-01-29 | `561f5db` | feat: File viewers (PDF, Word, Excel, CSV) |
| 2026-02-01 | `b1f6bbb` | docs: add rocket emoji to Features heading |
| 2026-02-01 | ... | feat: template system with slash commands |
| 2026-02-01 | ... | feat: mermaid diagram rendering |
| 2026-02-01 | ... | fix: mermaid newline preservation |
| 2026-02-01 | ... | feat: keyboard navigation for code blocks/tables |
| 2026-02-01 | ... | chore: v0.3.0 release |
| 2026-02-02 | ... | feat: add settings panel with template configuration |
| 2026-02-02 | ... | feat: improve settings panel and editor title menu |
| 2026-02-02 | ... | test: add settings panel E2E tests and fix flaky test |
| 2026-02-02 | ... | docs: update CHANGELOG for v0.4.0 |
| 2026-02-02 | ... | chore: bump version to 0.4.1 |
| 2026-02-02 | ... | docs: update README with new configuration options |

---

## Notes & Decisions

### 2026-01-29
- Project initialized
- Planning documentation complete
- Phase 1 complete: scaffolding, build system, extension boilerplate
- Extension compiles successfully
- Phase 2/3: Tiptap editor with full markdown support
  - StarterKit, Placeholder, Link, TaskList, TaskItem, Table extensions
  - tiptap-markdown for round-trip serialization
  - Extension ↔ webview message protocol (init, update, ready)
  - 150ms debounced sync, feedback loop prevention
  - VS Code theme integration via CSS variables
  - Slash command menu with keyboard navigation
  - All basic block types: headings, lists, tasks, quotes, code, tables, dividers
- Phase 4: Kanban board implementation
  - Markdown parser for ## columns and - [ ] tasks
  - dnd-kit/dom for drag-drop
  - Auto-complete on Done/Archive columns
  - Full theme integration
- Phase 5: File viewers implementation
  - PDF viewer with PDF.js (page nav, zoom, rotation)
  - Word viewer with Mammoth.js (DOCX to styled HTML)
  - Excel viewer with SheetJS (sheet tabs, headers)
  - CSV viewer with Papa Parse (sortable, delimiter options)

### 2026-01-30
- Completed remaining Phase 1-5 items before moving to Phase 6
  - Table Size Picker: Grid UI component for selecting table dimensions (8x8 max)
    - Created `webview/editor/components/TableSizePicker.ts`
    - Keyboard navigation (arrow keys, Enter, Escape)
    - Mouse hover highlighting
    - Integrated with slash command menu for `/table`
  - Tab/Shift+Tab navigation for tables
    - Added to KeyboardNavigation extension
    - Uses Tiptap's built-in `goToNextCell`/`goToPreviousCell` commands
    - Only activates when cursor is inside a table
  - Verified watch mode works (`npm run watch`)
  - All 128 e2e tests pass (6 pre-existing local image test failures remain)
  - Added CSV/TSV test files for file viewer testing
- Phase 4.5: Kanban Enhancements (NEW)
  - Column settings with [auto-complete] markdown syntax
  - Kebab menu dropdown for column options
  - Linear-style card detail modal with Tiptap editor
  - Card thumbnails (first image from description)
  - Board-level [no-thumbnails] setting with VS Code menu toggle
  - Full clipboard support for image editing in modal
  - Fixed image serialization (newlines), heading escaping, markdown stripping

### 2026-02-01
- **v0.3.0 Release**
- Phase 6: Templates (COMPLETE)
  - TemplateManager with gray-matter YAML frontmatter parsing
  - Template variables (date, time, datetime, year, month, day)
  - FileSystemWatcher for template folder changes
  - Slash command integration for templates
  - `pmtoolkit.setTemplateFolder` command with native folder picker dialog
  - Settings: templateFolder, templateWatchEnabled
- Phase 7: Mermaid Diagrams (COMPLETE)
  - MermaidNode Tiptap extension with full rendering
  - Theme integration (light/dark)
  - Edit/preview toggle
  - Critical fix: `preprocessMermaidBlocks()` to preserve newlines before tiptap-markdown parsing
  - MermaidNode registration in main.ts (was missing)
- Phase 7.5: Editor Enhancements (COMPLETE)
  - Code block keyboard navigation (ArrowUp/Down to exit, Cmd+Enter to insert below)
  - Table keyboard enhancement (Cmd+Enter to insert paragraph below)
  - View Source icon updated to `$(list-flat)` (3-line style)
  - Switched from CalVer to SemVer for VS Code Marketplace compatibility
- GitHub Issues cleanup
  - Closed #2 (Template System) - complete
  - Created and closed historical phase issues (#7-10)
  - Created #11 (Testing) and #12 (Release to Marketplace)
  - Closed #1 (File Tree Icons) as "won't do" - VS Code doesn't allow overriding built-in language icons

### 2026-02-02
- **v0.4.0 Release** - Settings Panel
- Phase 8: Settings Panel (COMPLETE)
  - Created `src/settings/SettingsPanel.ts` with Cursor-style UI
  - Card-based sections: Editor, Templates, Kanban, Support
  - New settings: editorFontSize, kanbanDefaultColumns, kanbanShowThumbnails, kanbanSaveDelay
  - Menu integration: settings in overflow menu, View Source icon preserved
  - Buy Me a Coffee support link
- Phase 9: Testing Infrastructure (COMPLETE)
  - 22 new tests for Settings Panel
  - Created settings-harness.html for E2E testing
  - Fixed flaky "Shift+Tab outdents list item" test
  - Total: 192 passing tests (194 total, 2 skipped)
- GitHub Issues
  - Closed #5 (Improve extension settings)
  - Updated #11 (Testing) with current test coverage
- **v0.4.1 Release** - Testing & Documentation
  - README updated with new configuration options
  - CHANGELOG updated

### 2026-02-05
- **v0.5.0 Release** - Bubble Menu & Links
- Phase 9.5: Bubble Menu (COMPLETE)
  - Floating toolbar on text selection with block type dropdown
  - Formatting buttons and link insertion
  - Link slash command (`/link`)

### 2026-02-06
- **React Migration** (`feature/react-migration` branch)
- Phase 10.5: React Migration (COMPLETE)
  - Migrated editor UI to React: SlashCommand, ImageNode, MermaidNode
  - Added BlockHandle (drag handles in gutter) and DocumentOutline
  - Fixed undo history pollution from external content updates
- Phase 11: Image Redesign & Table Controls (COMPLETE)
  - Complete image system overhaul: drop zone, resize handles, popover toolbar
  - Image captions, width/alignment metadata comments, VS Code file picker
  - Table grippers for drag-to-reorder rows and columns
  - Table context menus for insert/delete operations
  - Consistent floating menu styling across all menus
  - Branding cleanup: removed "Obsidian" and "Notion" references
  - Settings toggles now use theme variables
  - 277 E2E tests (all passing, up from 192)
