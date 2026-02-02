# PM Toolkit - Planning Documentation

## Project Overview

**PM Toolkit** is an open-source VS Code/Cursor extension for markdown editing and kanban boards, built with modern libraries and no licensing restrictions.

## Documentation Index

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture, project structure, message protocols |
| [tech-stack.md](./tech-stack.md) | Technology choices and comparisons |
| [features.md](./features.md) | Feature specifications and requirements |

## Quick Summary

### Tech Stack

- **Editor**: Tiptap (ProseMirror-based)
- **Drag-Drop**: dnd-kit
- **PDF**: PDF.js
- **Word**: Mammoth.js
- **Excel**: SheetJS
- **CSV**: Papa Parse
- **Diagrams**: Mermaid.js
- **Build**: esbuild + TypeScript

### Key Features

1. WYSIWYG Markdown Editor with slash commands
2. Kanban Board (markdown-based)
3. File Viewers (PDF, Word, Excel, CSV)
4. Custom Templates
5. Mermaid Diagrams

### Project Status

**Current Version**: 0.3.0

- [x] Requirements analysis
- [x] Technology selection
- [x] Architecture design
- [x] Project scaffolding
- [x] Phase 1: Foundation (Extension boilerplate, Tiptap editor, messaging)
- [x] Phase 2: Editor Features (Slash commands, markdown, themes, tables)
- [x] Phase 3: Kanban Board (Parser, dnd-kit, drag-drop, card modal, thumbnails)
- [x] Phase 4: File Viewers (PDF, Word, Excel, CSV - all working)
- [x] Phase 5: Templates (Slash command integration, folder picker, file watcher)
- [x] Phase 6: Mermaid Diagrams (Rendering, theme support, preprocessing)
- [ ] Testing
- [ ] Release

## Recent Updates (Feb 2025)

- **v0.3.0 Release**
  - Template system with slash command integration and folder picker dialog
  - Mermaid diagram rendering with preprocessing for newline preservation
  - Keyboard navigation for code blocks (ArrowUp/Down to exit, Cmd+Enter to insert below)
  - Keyboard navigation for tables (Cmd+Enter to insert paragraph below)
  - View Source icon updated to 3-line style

## Previous Updates (Jan 2025)

- View Source command for markdown/kanban editors
- Kanban file language registration with custom icons
- All viewers set to default priority (auto-open)
- PDF viewer worker bundling fix
- Card modal with clipboard support
- Kanban column settings and card thumbnails
