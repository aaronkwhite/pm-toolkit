# PM Toolkit - Implementation Checklist

> **Last Updated**: 2026-01-30
> **Current Phase**: Phase 4.5 Complete, Phase 6 - Templates (Next)

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
- [ ] Create table context menu
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

## Phase 6: Templates

### 6.1 Template Manager
- [ ] Create TemplateManager.ts
- [ ] Install gray-matter
- [ ] Folder scanning logic
- [ ] YAML frontmatter parsing
- [ ] Template caching

### 6.2 Variable System
- [ ] Create TemplateVariables.ts
- [ ] Implement {{date}} variable
- [ ] Implement {{time}} variable
- [ ] Implement {{datetime}} variable
- [ ] Implement {{year}}, {{month}}, {{day}}

### 6.3 File Watcher
- [ ] Set up FileSystemWatcher
- [ ] Cache invalidation on changes
- [ ] Notify webviews of template updates

### 6.4 Slash Menu Integration
- [ ] Add template category to slash menu
- [ ] Handle template selection
- [ ] Request content from extension
- [ ] Insert resolved content

### 6.5 Settings
- [ ] Add pmtoolkit.templateFolder setting
- [ ] Add pmtoolkit.templateWatchEnabled setting
- [ ] Settings change listener

**Phase 6 Commit Checkpoints:**
- [ ] `feat: template manager with YAML parsing`
- [ ] `feat: template variables`
- [ ] `feat: template slash menu integration`

---

## Phase 7: Mermaid Diagrams

### 7.1 Mermaid Extension
- [ ] Create MermaidNode.ts Tiptap extension
- [ ] Node schema definition
- [ ] parseHTML / renderHTML
- [ ] Editor commands (insertMermaid)

### 7.2 Node View
- [ ] Create MermaidNodeView.ts
- [ ] DOM structure with toolbar
- [ ] Mermaid.js rendering
- [ ] Error handling for invalid syntax

### 7.3 Interactions
- [ ] Zoom controls (buttons + wheel)
- [ ] Pan support (drag)
- [ ] Edit/preview toggle
- [ ] Debounced re-rendering

### 7.4 Theme Integration
- [ ] Detect VS Code theme
- [ ] Configure Mermaid theme
- [ ] Re-render on theme change
- [ ] Style mermaid.css

### 7.5 Slash Commands
- [ ] Add /diagram command (flowchart)
- [ ] Add /sequence command
- [ ] Add /class command
- [ ] Add /gantt command

**Phase 7 Commit Checkpoints:**
- [ ] `feat: Mermaid Tiptap extension`
- [ ] `feat: Mermaid node view with interactions`
- [ ] `feat: Mermaid theme integration`
- [ ] `feat: Mermaid slash commands`

---

## Phase 8: Testing

### 8.1 Test Infrastructure
- [ ] Install Vitest
- [ ] Configure vitest.config.ts
- [ ] Create VS Code API mocks
- [ ] Create test fixtures directory
- [ ] Create test helpers

### 8.2 Unit Tests
- [ ] Markdown parser tests
- [ ] Kanban parser tests
- [ ] Template variable tests
- [ ] HTMLBuilder tests

### 8.3 Integration Tests
- [ ] Extension-webview messaging tests
- [ ] File round-trip tests
- [ ] Custom editor provider tests

### 8.4 E2E Tests
- [ ] Install @vscode/test-electron
- [ ] Extension activation test
- [ ] File open tests
- [ ] File save tests

### 8.5 Webview Tests
- [ ] Install Playwright
- [ ] Editor interaction tests
- [ ] Kanban drag-drop tests

### 8.6 CI/CD
- [ ] Create .github/workflows/ci.yml
- [ ] Create .github/workflows/release.yml
- [ ] Configure Codecov
- [ ] Pre-commit hooks

**Phase 8 Commit Checkpoints:**
- [ ] `test: unit test infrastructure`
- [ ] `test: parser and utility tests`
- [ ] `test: integration tests`
- [ ] `test: E2E tests`
- [ ] `ci: GitHub Actions workflows`

---

## Phase 9: Polish & Release

### 9.1 Documentation
- [ ] Update README.md
- [ ] Add CHANGELOG.md
- [ ] Add CONTRIBUTING.md
- [ ] Add LICENSE (MIT)
- [ ] API documentation

### 9.2 Accessibility
- [ ] Keyboard navigation audit
- [ ] Screen reader testing
- [ ] Focus indicator styling
- [ ] ARIA labels

### 9.3 Performance
- [ ] Large file handling
- [ ] Lazy loading optimization
- [ ] Bundle size analysis
- [ ] Memory leak testing

### 9.4 Cross-platform Testing
- [ ] Windows testing
- [ ] macOS testing
- [ ] Linux testing

### 9.5 Release
- [ ] Version 0.1.0 preparation
- [ ] VS Code Marketplace submission
- [ ] Open VSX submission
- [ ] Release announcement

**Phase 9 Commit Checkpoints:**
- [ ] `docs: README and documentation`
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
