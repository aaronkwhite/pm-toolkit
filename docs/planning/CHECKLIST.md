# PM Toolkit - Implementation Checklist

> **Last Updated**: 2026-01-29
> **Current Phase**: Phase 2/3 - Markdown Editor & Slash Commands (In Progress)

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
- [ ] Test extension loads in Extension Host

### 1.3 Development Workflow
- [x] Create .vscode/launch.json
- [x] Create .vscode/tasks.json
- [x] Create .vscode/extensions.json
- [ ] Verify F5 debugging works
- [ ] Verify watch mode works

### 1.4 Webview Stubs
- [x] Create webview/editor/main.ts (stub)
- [x] Create webview/editor/styles/editor.css (stub)
- [x] Create webview/kanban/main.ts (stub)
- [x] Create webview/kanban/styles/kanban.css (stub)
- [ ] Verify webview loads in custom editor

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
- [ ] Test light/dark theme switching

### 2.5 Table Editing
- [x] Install @tiptap/extension-table packages
- [x] Configure table extension
- [ ] Add Tab/Shift+Tab navigation
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
- [ ] Create TableSizePicker.ts component
- [ ] Grid UI for selecting rows x columns
- [ ] Insert table on selection

**Phase 3 Commit Checkpoints:**
- [x] `feat: slash command extension`
- [x] `feat: command menu UI with keyboard nav`
- [x] `feat: built-in slash commands`

---

## Phase 4: Kanban Board

### 4.1 Markdown Parser
- [ ] Create parser.ts with parseMarkdown()
- [ ] Create serializeBoard()
- [ ] Handle ## headings as columns
- [ ] Handle - [ ] items as cards
- [ ] Handle indented descriptions
- [ ] Preserve preamble content
- [ ] Test round-trip fidelity

### 4.2 State Management
- [ ] Create state.ts with BoardStateManager
- [ ] Implement LOAD action
- [ ] Implement MOVE_CARD action
- [ ] Implement TOGGLE_CARD action
- [ ] Implement ADD_CARD action
- [ ] Implement DELETE_CARD action
- [ ] Implement UPDATE_CARD action
- [ ] Debounced sync to extension (150ms)

### 4.3 dnd-kit Integration
- [ ] Install @dnd-kit/dom
- [ ] Create dnd.ts with DragDropManager setup
- [ ] Register sortables for cards
- [ ] Handle drag-end events
- [ ] Test cross-column drag

### 4.4 UI Components
- [ ] Create Board.ts component
- [ ] Create Column.ts component
- [ ] Create Card.ts component
- [ ] Card checkbox toggle
- [ ] Card double-click to edit
- [ ] Card context menu (delete, archive)
- [ ] Add task button per column

### 4.5 Auto-behaviors
- [ ] Auto-complete on move to Done column
- [ ] Auto-complete on move to Archive column
- [ ] Hide Archive column when empty
- [ ] Show task count per column

### 4.6 Styling
- [ ] Create kanban.css
- [ ] Style with VS Code variables
- [ ] Drag state styling
- [ ] Edit mode styling

**Phase 4 Commit Checkpoints:**
- [ ] `feat: kanban markdown parser`
- [ ] `feat: kanban state management`
- [ ] `feat: dnd-kit drag-drop integration`
- [ ] `feat: kanban UI components`
- [ ] `feat: kanban auto-behaviors and styling`

---

## Phase 5: File Viewers

### 5.1 Base Infrastructure
- [ ] Create BaseViewerProvider.ts
- [ ] Common toolbar CSS
- [ ] CSP configuration helper
- [ ] Zoom controls pattern

### 5.2 PDF Viewer
- [ ] Create PDFViewerProvider.ts
- [ ] Create pdf-viewer.ts webview
- [ ] PDF.js CDN integration
- [ ] Page navigation
- [ ] Zoom controls
- [ ] Rotation controls
- [ ] Test with various PDFs

### 5.3 Word Viewer
- [ ] Create DocxViewerProvider.ts
- [ ] Create docx-viewer.ts webview
- [ ] Mammoth.js integration
- [ ] Style HTML output
- [ ] Handle embedded images
- [ ] Test with various DOCX files

### 5.4 Excel Viewer
- [ ] Create ExcelViewerProvider.ts
- [ ] Create excel-viewer.ts webview
- [ ] SheetJS CDN integration
- [ ] Sheet tabs UI
- [ ] Column/row headers
- [ ] Cell formatting
- [ ] Test with various XLSX files

### 5.5 CSV Viewer
- [ ] Create CSVViewerProvider.ts
- [ ] Create csv-viewer.ts webview
- [ ] Papa Parse integration
- [ ] Auto-detect delimiter
- [ ] Manual delimiter override
- [ ] Header row toggle
- [ ] Sortable columns
- [ ] Test with various CSV/TSV files

**Phase 5 Commit Checkpoints:**
- [ ] `feat: file viewer base infrastructure`
- [ ] `feat: PDF viewer`
- [ ] `feat: Word viewer`
- [ ] `feat: Excel viewer`
- [ ] `feat: CSV viewer`

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
