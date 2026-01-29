# PM Toolkit - Implementation Checklist

> **Last Updated**: 2026-01-29
> **Current Phase**: Phase 0 - Project Setup

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
- [ ] Create package.json with all dependencies
- [ ] Create tsconfig.json (extension - Node.js)
- [ ] Create tsconfig.webview.json (webview - browser)
- [ ] Create esbuild.js build script
- [ ] Create directory structure per architecture.md
- [ ] Add .eslintrc.json
- [ ] Add .prettierrc
- [ ] Verify `npm install` works
- [ ] Verify `npm run compile` works

### 1.2 VS Code Extension Boilerplate
- [ ] Create src/extension.ts (main entry)
- [ ] Create src/types/index.ts (shared types)
- [ ] Create src/editors/HTMLBuilder.ts
- [ ] Create src/editors/MarkdownEditorProvider.ts (stub)
- [ ] Create src/editors/KanbanEditorProvider.ts (stub)
- [ ] Register custom editors in package.json
- [ ] Test extension loads in Extension Host

### 1.3 Development Workflow
- [ ] Create .vscode/launch.json
- [ ] Create .vscode/tasks.json
- [ ] Create .vscode/extensions.json
- [ ] Verify F5 debugging works
- [ ] Verify watch mode works

### 1.4 Webview Stubs
- [ ] Create webview/editor/main.ts (stub)
- [ ] Create webview/editor/styles/editor.css (stub)
- [ ] Create webview/kanban/main.ts (stub)
- [ ] Create webview/kanban/styles/kanban.css (stub)
- [ ] Verify webview loads in custom editor

**Phase 1 Commit Checkpoints:**
- [ ] `feat: project scaffolding and build config`
- [ ] `feat: VS Code extension boilerplate`
- [ ] `feat: webview stubs and dev workflow`

---

## Phase 2: Markdown Editor

### 2.1 Tiptap Setup
- [ ] Install Tiptap packages
- [ ] Create basic editor initialization
- [ ] Configure StarterKit extension
- [ ] Add Placeholder extension
- [ ] Verify editor renders in webview

### 2.2 Markdown Import/Export
- [ ] Install tiptap-markdown
- [ ] Configure markdown serialization
- [ ] Test markdown → editor → markdown round-trip
- [ ] Handle GFM tables
- [ ] Handle task lists

### 2.3 Extension ↔ Webview Communication
- [ ] Implement message protocol types
- [ ] Handle 'init' message (load content)
- [ ] Handle 'update' message (content changed)
- [ ] Handle external file changes
- [ ] Prevent feedback loops
- [ ] Add debouncing (150ms)

### 2.4 Theme Integration
- [ ] Create theme.css with VS Code variables
- [ ] Style headings, paragraphs, lists
- [ ] Style code blocks, blockquotes
- [ ] Style links, tables
- [ ] Test light/dark theme switching

### 2.5 Table Editing
- [ ] Install @tiptap/extension-table packages
- [ ] Configure table extension
- [ ] Add Tab/Shift+Tab navigation
- [ ] Create table context menu
- [ ] Test table markdown serialization

**Phase 2 Commit Checkpoints:**
- [ ] `feat: Tiptap editor with markdown support`
- [ ] `feat: extension-webview communication`
- [ ] `feat: theme integration and styling`
- [ ] `feat: table editing support`

---

## Phase 3: Slash Commands

### 3.1 Suggestion Plugin Setup
- [ ] Install @tiptap/suggestion
- [ ] Create SlashCommand.ts extension
- [ ] Trigger on `/` character
- [ ] Basic popup rendering

### 3.2 Command Menu UI
- [ ] Create SlashCommandMenu.ts component
- [ ] Style with VS Code variables
- [ ] Keyboard navigation (up/down/enter/escape)
- [ ] Filter as user types
- [ ] Position near cursor (flip if near edges)

### 3.3 Built-in Commands
- [ ] Text (paragraph)
- [ ] Heading 1, 2, 3
- [ ] Bullet list
- [ ] Numbered list
- [ ] Checkbox/task
- [ ] Quote
- [ ] Code block
- [ ] Divider
- [ ] Table (with size picker)

### 3.4 Table Size Picker
- [ ] Create TableSizePicker.ts component
- [ ] Grid UI for selecting rows x columns
- [ ] Insert table on selection

**Phase 3 Commit Checkpoints:**
- [ ] `feat: slash command extension`
- [ ] `feat: command menu UI with keyboard nav`
- [ ] `feat: built-in slash commands`

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
| 2026-01-29 | `9f7fbcf` | Initial commit |

---

## Notes & Decisions

### 2026-01-29
- Project initialized
- Planning documentation complete
- Ready to begin Phase 1 implementation
