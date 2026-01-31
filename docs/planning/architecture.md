# PM Toolkit - Architecture Plan

A VS Code/Cursor extension for markdown editing and kanban boards. Open source, MIT licensed.

## Overview

PM Toolkit transforms markdown files into a visual editing experience while keeping everything in standard markdown format. No proprietary formats, no lock-in, no licensing restrictions.

## Core Features

1. **WYSIWYG Markdown Editor** - Real-time rendering with slash commands
2. **Kanban Boards** - Visual task management from markdown
3. **File Viewers** - PDF, Word, Excel, CSV (read-only)
4. **Custom Templates** - Reusable content blocks with variables
5. **Mermaid Diagrams** - Interactive flowcharts and diagrams

---

## Technology Stack

### Editor Core

| Component | Library | Rationale |
|-----------|---------|-----------|
| Rich Text Editor | **Tiptap** | Built on ProseMirror, battle-tested (Asana, NYT), excellent DX, active maintenance |
| Slash Commands | Tiptap Suggestion Plugin | Native integration, no custom menu needed |
| Markdown Parser | ProseMirror Markdown | Comes with Tiptap ecosystem |

**Why Tiptap?**
- English-first documentation and community
- ProseMirror ecosystem compatibility
- Better extensibility model
- Active maintenance
- Framework-agnostic (works in webviews)

### Kanban Board

| Component | Library | Rationale |
|-----------|---------|-----------|
| Drag & Drop | **dnd-kit** | Modern, 5.3M weekly downloads, excellent customization |
| State Management | Vanilla TypeScript | Simple enough, no framework needed |

**Why dnd-kit?**
- Most modern React DnD library
- Smooth animations out of the box
- Accessibility built-in (keyboard support)
- Grid support if needed later
- Active development (unlike deprecated react-beautiful-dnd)

### File Viewers

| Format | Library | Notes |
|--------|---------|-------|
| PDF | **PDF.js** (Mozilla) | Industry standard, no alternative |
| Word (.docx) | **Mammoth.js** | Best DOCX-to-HTML converter |
| Excel (.xlsx) | **SheetJS** | Industry standard spreadsheet parser |
| CSV/TSV | **Papa Parse** | Battle-tested CSV parser, handles edge cases |

### Diagrams

| Component | Library | Notes |
|-----------|---------|-------|
| Mermaid | **Mermaid.js** | Industry standard, no alternative |

### Build & Development

| Tool | Purpose |
|------|---------|
| TypeScript | Type safety throughout |
| esbuild | Fast bundling for extension and webviews |
| VS Code Extension API | Custom editor providers |

---

## Architecture

```
pm-toolkit/
├── src/
│   ├── extension.ts              # Main entry point
│   ├── editors/
│   │   ├── MarkdownEditorProvider.ts
│   │   ├── KanbanEditorProvider.ts
│   │   └── HTMLBuilder.ts
│   ├── viewers/
│   │   ├── PDFViewerProvider.ts
│   │   ├── DocxViewerProvider.ts
│   │   ├── ExcelViewerProvider.ts
│   │   └── CSVViewerProvider.ts
│   ├── templates/
│   │   └── TemplateManager.ts
│   └── types/
│       └── index.ts
├── webview/
│   ├── editor/                   # Tiptap-based editor
│   │   ├── main.ts
│   │   ├── extensions/           # Custom Tiptap extensions
│   │   │   ├── SlashCommand.ts
│   │   │   └── Mermaid.ts
│   │   └── styles/
│   ├── kanban/                   # Kanban board UI
│   │   ├── main.ts
│   │   ├── Board.tsx
│   │   ├── Column.tsx
│   │   ├── Card.tsx
│   │   └── parser.ts             # Markdown <-> Board conversion
│   └── viewers/                  # File viewer webviews
│       ├── pdf-viewer.ts
│       ├── docx-viewer.ts
│       ├── excel-viewer.ts
│       └── csv-viewer.ts
├── docs/
│   └── planning/
├── package.json
├── tsconfig.json
└── build.js
```

---

## Extension ↔ Webview Communication

Message protocol between VS Code extension and webviews:

### Messages: Extension → Webview

| Type | Payload | Purpose |
|------|---------|---------|
| `init` | `{ content: string, filename: string }` | Initial content load |
| `update` | `{ content: string }` | External content change |
| `templates` | `{ templates: Template[] }` | Send available templates |

### Messages: Webview → Extension

| Type | Payload | Purpose |
|------|---------|---------|
| `ready` | - | Webview initialized |
| `update` | `{ content: string }` | Content changed in editor |
| `requestTemplates` | - | Request template refresh |

---

## Kanban Board Format

Standard markdown format (compatible with other tools):

```markdown
## Backlog

- [ ] Task one
- [ ] Task two with details
  Additional notes indented

## In Progress

- [ ] Active task

## Done

- [x] Completed task
```

**Parsing Rules:**
- `## Heading` → Column
- `- [ ] text` → Card (incomplete)
- `- [x] text` → Card (complete)
- Indented lines → Card description
- Moving to "Done" or "Archive" auto-completes

---

## Template System

Templates are markdown files with YAML frontmatter:

```markdown
---
template_name: "Meeting Notes"
template_description: "Template for meeting notes"
template_icon: "calendar"
---

# Meeting Notes - {{date}}

## Attendees

-

## Agenda

1.

## Action Items

- [ ]
```

**Supported Variables:**
- `{{date}}` - Current date (YYYY-MM-DD)
- `{{time}}` - Current time (HH:MM:SS)
- `{{datetime}}` - Date and time
- `{{year}}`, `{{month}}`, `{{day}}`

---

## Custom Editor Registration

```json
{
  "customEditors": [
    {
      "viewType": "pmtoolkit.markdownEditor",
      "displayName": "PM Toolkit",
      "selector": [{ "filenamePattern": "*.md" }],
      "priority": "default"
    },
    {
      "viewType": "pmtoolkit.kanbanEditor",
      "displayName": "Kanban Board",
      "selector": [{ "filenamePattern": "*.kanban" }],
      "priority": "default"
    },
    {
      "viewType": "pmtoolkit.pdfViewer",
      "displayName": "PDF Viewer",
      "selector": [{ "filenamePattern": "*.pdf" }],
      "priority": "default"
    }
  ]
}
```

---

## Phase Plan

### Phase 1: Foundation ✅
- [x] Project scaffolding
- [x] VS Code extension boilerplate
- [x] Basic Tiptap editor in webview
- [x] Extension ↔ Webview message protocol
- [x] File save/load working

### Phase 2: Editor Features ✅
- [x] Slash command menu
- [x] Markdown import/export
- [x] Theme matching (dark/light)
- [x] Formatting toolbar
- [x] Table editing

### Phase 3: Kanban Board ✅
- [x] Markdown parser (board ↔ markdown)
- [x] Board rendering with dnd-kit
- [x] Drag-drop between columns
- [x] Task completion toggle
- [x] Add/edit/delete tasks
- [x] Card modal with rich editing
- [x] Card thumbnails (image preview)
- [x] Column settings (WIP limits, colors)
- [x] Clipboard support in card modal

### Phase 4: File Viewers ✅
- [x] PDF viewer with PDF.js
- [x] Word viewer with Mammoth.js
- [x] Excel viewer with SheetJS
- [x] CSV viewer with Papa Parse
- [x] All viewers set to default priority

### Phase 5: Templates & Polish (In Progress)
- [ ] Template manager
- [ ] Template variables
- [ ] Mermaid diagram support
- [ ] Outline panel
- [ ] Accessibility audit

### Additional Features Completed
- [x] View Source command (switch to text editor)
- [x] Kanban file language registration (.kanban)
- [x] Custom file icons for .kanban files
- [x] Toggle card thumbnails command

---

## References

- [Tiptap Documentation](https://tiptap.dev/)
- [dnd-kit Documentation](https://dndkit.com/)
- [VS Code Custom Editors](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [ProseMirror Guide](https://prosemirror.net/docs/guide/)
