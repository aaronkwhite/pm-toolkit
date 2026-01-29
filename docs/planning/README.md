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

- [x] Requirements analysis
- [x] Technology selection
- [x] Architecture design
- [ ] Project scaffolding
- [ ] Implementation
- [ ] Testing
- [ ] Release

## Next Steps

1. Rename project directory to `pm-toolkit`
2. Initialize npm project
3. Set up VS Code extension boilerplate
4. Implement Phase 1 (Foundation)
