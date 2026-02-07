# PM Toolkit - Planning Documentation

## Project Overview

**PM Toolkit** is an open-source VS Code/Cursor extension for markdown editing and kanban boards, built with modern libraries and no licensing restrictions.

## Documentation Index

| Document | Description |
|----------|-------------|
| [architecture.md](./architecture.md) | System architecture, project structure, message protocols |
| [tech-stack.md](./tech-stack.md) | Technology choices and comparisons |
| [features.md](./features.md) | Feature specifications and requirements |
| [testing-plan.md](./testing-plan.md) | Testing strategy (aspirational — actual tests are Playwright E2E) |
| [branding-guide.md](./branding-guide.md) | Brand positioning, voice, visual identity |
| [CHECKLIST.md](./CHECKLIST.md) | Implementation tracking by phase |
| [2026-02-05-react-migration.md](./2026-02-05-react-migration.md) | React migration plan and status |

## Quick Summary

### Tech Stack

- **Editor**: Tiptap + @tiptap/react (ProseMirror-based)
- **UI**: React 18
- **Drag-Drop**: dnd-kit (kanban), ProseMirror native (editor blocks)
- **PDF**: PDF.js
- **Word**: Mammoth.js
- **Excel**: SheetJS
- **CSV**: Papa Parse
- **Diagrams**: Mermaid.js
- **Build**: esbuild + TypeScript
- **Tests**: Playwright (277 E2E tests)

### Key Features

1. WYSIWYG Markdown Editor with slash commands, bubble menu, block handles
2. Image system with drop zone, resize, alignment, popover toolbar
3. Table controls with drag-to-reorder grips and context menus
4. Kanban Board (markdown-based) with drag-and-drop
5. File Viewers (PDF, Word, Excel, CSV)
6. Custom Templates with variables
7. Mermaid Diagrams with theme support
8. Document Outline for heading navigation

### Project Status

**Current Version**: 0.5.0 (`feature/react-migration` branch)

- [x] Requirements analysis
- [x] Technology selection
- [x] Architecture design
- [x] Project scaffolding
- [x] Phase 1: Foundation (Extension boilerplate, Tiptap editor, messaging)
- [x] Phase 2: Editor Features (Slash commands, markdown, themes, tables)
- [x] Phase 3: Kanban Board (Parser, dnd-kit, drag-drop, card modal, thumbnails)
- [x] Phase 4: File Viewers (PDF, Word, Excel, CSV)
- [x] Phase 5: Templates (Slash command integration, folder picker, file watcher)
- [x] Phase 6: Mermaid Diagrams (Rendering, theme support, preprocessing)
- [x] Phase 7: Settings Panel
- [x] Phase 8: Bubble Menu & Links
- [x] Phase 9: React Migration (SlashCommand, ImageNode, MermaidNode, BlockHandle, DocumentOutline)
- [x] Phase 10: Image Redesign & Table Controls
- [x] Testing (277 E2E tests, all passing)
- [ ] Release
