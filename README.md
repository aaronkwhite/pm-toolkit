# PM Toolkit

[![Latest Release](https://img.shields.io/github/v/release/aaronkwhite/pm-toolkit?label=version)](https://github.com/aaronkwhite/pm-toolkit/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/aaronkwhite/pm-toolkit/blob/main/LICENSE)
[![Changelog](https://img.shields.io/badge/changelog-view-blue)](https://github.com/aaronkwhite/pm-toolkit/blob/main/CHANGELOG.md)
[![Website](https://img.shields.io/badge/website-getpmtoolkit.com-4A90D9)](https://getpmtoolkit.com)

> **Free Forever.** No trial period. No yearly fee. No read-only mode. Every save is validated to protect your files.

**Your docs. Your editor.** Visual markdown, kanban boards, and file viewers — right where you code.

Write specs with Cursor's agent, then polish them visually. Keep planning docs, task boards, and reference files next to your code. Everything stays in plain text — portable, version-controlled, and yours.

#### Support the project

If PM Toolkit saves you time, consider buying me a coffee. Your support helps keep this project maintained and free for everyone.

<a href="https://buymeacoffee.com/aaronkwhite">
  <img src="https://github.com/user-attachments/assets/fa213bf0-9dc1-4c94-b5d2-3e0612ccb37d" width="128" alt="Buy A-A-Ron a Coffee" />
</a>

## Everything you need

### No more preview tabs

Type `/` for slash commands. Select text for instant formatting. Drag in images. It just works.

- **Slash commands** — Type `/` to insert headings, lists, tables, code blocks, images, diagrams, links, and templates
- **Bubble menu** — Select any text for a floating toolbar with formatting and block type controls
- **Block handles** — Drag any block to reorder it, or click `+` to insert new content
- **Document outline** — Collapsible heading sidebar for navigating long documents
- **Images** — Paste, drag and drop, or browse. Resize with handles, align with the popover toolbar, add captions
- **Tables** — Visual editing with drag-to-reorder rows and columns, right-click context menus, and auto-expanding add bars
- **Mermaid diagrams** — Flowcharts, sequence diagrams, and more render inline with fit-to-view
- **Templates** — Create reusable document templates and insert them via `/` commands
- **Task lists** — Interactive checkboxes that save to standard markdown syntax
- **PDF export** — Export any document to a pixel-perfect PDF via Command Palette or the title bar button
- **Smart navigation** — Arrow keys and Cmd+Enter move through code blocks and tables naturally

### Tasks without context switching

Drag cards between columns. Your board stays as plain markdown — portable, version-controlled, yours.

- **Drag and drop** — Move cards between columns
- **Card details** — Click to expand and edit with full formatting
- **Image support** — Paste images directly into cards
- **Auto-complete columns** — Cards automatically mark as done when moved
- **Thumbnails** — See image previews on cards

Create a `.kanban` file or right-click any `.md` file and select "Open as Kanban Board."

### View docs without leaving Cursor

PDF, Word, Excel, CSV — open them right in your editor. No more jumping to Finder.

- **PDF** — Page navigation, zoom, rotation
- **Word (.docx)** — View documents with formatting preserved
- **Excel (.xlsx)** — Browse spreadsheets with sheet tabs
- **CSV/TSV** — Sortable tables with auto-detected delimiters

## Installation

**[Visit the website →](https://getpmtoolkit.com)**

### From Cursor Marketplace

Search for "PM Toolkit" in the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`).


## Getting Started

### Markdown Editing

1. Open any `.md` file
2. Start typing—formatting appears as you write
3. Type `/` at the start of a line to see available blocks

**Keyboard shortcuts:**
- `Cmd/Ctrl + B` — Bold
- `Cmd/Ctrl + I` — Italic
- `Cmd/Ctrl + K` — Insert link
- `Cmd/Ctrl + Z` — Undo
- `Cmd/Ctrl + Shift + Z` — Redo
- `Cmd/Ctrl + Enter` — Exit code block or table (insert paragraph below)
- `Tab` / `Shift+Tab` — Navigate table cells (Tab in last cell exits table)
- `Arrow Up` — Exit code block from top
- `Arrow Down` — Exit code block from bottom

### Kanban Boards

Create a new file with the `.kanban` extension:

```markdown
## To Do

- [ ] First task
- [ ] Second task
  Additional notes go here

## In Progress

- [ ] Working on this

## Done [auto-complete]

- [x] Completed task
```

Cards are standard markdown checkboxes. Columns are `##` headings. Add `[auto-complete]` to a column name to automatically check off cards moved there.

### Mermaid Diagrams

Insert diagrams using the `/mermaid` slash command or write them directly:

~~~markdown
```mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Done]
    B -->|No| D[Try Again]
    D --> B
```
~~~

Hover over a diagram to see controls for editing or switching between scroll and fit modes.

## Templates

Create reusable document templates that appear in the slash command menu.

1. Create a folder with your template `.md` files
2. Run **PM Toolkit: Set Template Folder** from the Command Palette (`Cmd/Ctrl + Shift + P`)
3. Select your templates folder
4. Type `/` in any document to see your templates listed

Templates are regular markdown files. The filename becomes the template name in the menu.

### PDF Export

Export any markdown document to PDF — the output looks identical to the editor.

1. Open a `.md` file in PM Toolkit
2. Run **PM Toolkit: Export to PDF** from the Command Palette, or click the PDF icon in the editor title bar
3. The PDF is saved next to your `.md` file

Requires Chrome, Chromium, Edge, or Brave installed (auto-detected). Set a custom path with `pmtoolkit.pdfChromePath` if needed.

## Configuration

Access settings via the **PM Toolkit Settings** command (from the editor `...` menu or Command Palette), or through `Code` → `Settings` → `Extensions` → `PM Toolkit`.

| Setting | Description | Default |
|---------|-------------|---------|
| `pmtoolkit.editorFontSize` | Font size for the editor and kanban board (10-24px) | 14 |
| `pmtoolkit.templateFolder` | Path to folder containing template markdown files | — |
| `pmtoolkit.templateWatchEnabled` | Auto-reload templates when folder contents change | true |
| `pmtoolkit.kanbanDefaultColumns` | Comma-separated list of columns for new boards | Backlog, In Progress, Done |
| `pmtoolkit.kanbanShowThumbnails` | Show image thumbnails on kanban cards | true |
| `pmtoolkit.kanbanSaveDelay` | Delay before saving kanban changes (50-2000ms) | 150 |
| `pmtoolkit.imageAssetsPath` | Directory where uploaded images are saved (relative to the document) | assets |
| `pmtoolkit.pdfChromePath` | Path to Chrome/Chromium for PDF export (auto-detected if empty) | — |
| `pmtoolkit.pdfPageSize` | Page size for PDF export | A4 |
| `pmtoolkit.pdfMarginTop` / `Bottom` / `Left` / `Right` | PDF margins | 20mm / 20mm / 15mm / 15mm |
| `pmtoolkit.pdfPrintBackground` | Include background colors in PDF (e.g., code blocks) | true |

## Built With

PM Toolkit is built on solid open-source foundations:

| Library | Purpose | License |
|---------|---------|---------|
| [Tiptap](https://tiptap.dev) | Rich text editor framework | MIT |
| [ProseMirror](https://prosemirror.net) | Editor toolkit (powers Tiptap) | MIT |
| [dnd-kit](https://dndkit.com) | Drag and drop | MIT |
| [Mermaid](https://mermaid.js.org) | Diagrams from text | MIT |
| [Lucide](https://lucide.dev) | Icons | ISC |
| [PDF.js](https://mozilla.github.io/pdf.js/) | PDF rendering | Apache 2.0 |
| [Mammoth](https://github.com/mwilliamson/mammoth.js) | Word document conversion | BSD-2 |
| [SheetJS](https://sheetjs.com) | Excel parsing | Apache 2.0 |
| [Papa Parse](https://www.papaparse.com) | CSV parsing | MIT |
| [Puppeteer](https://pptr.dev) | PDF export (puppeteer-core) | Apache 2.0 |

## Contributing

Contributions are welcome! Please:

1. Check [existing issues](https://github.com/aaronkwhite/pm-toolkit/issues) before opening a new one
2. For bugs, include steps to reproduce and your environment details
3. For features, describe the use case and why it would help

### Development Setup

```bash
# Clone the repository
git clone https://github.com/aaronkwhite/pm-toolkit.git
cd pm-toolkit

# Install dependencies
npm install

# Start development (watches for changes)
npm run watch

# In Cursor: Press F5 to launch Extension Development Host
```

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui
```

## Support

- **Bug reports** — [Open an issue](https://github.com/aaronkwhite/pm-toolkit/issues/new?template=bug_report.md)
- **Feature requests** — [Open an issue](https://github.com/aaronkwhite/pm-toolkit/issues/new?template=feature_request.md)
- **Questions** — [Start a discussion](https://github.com/aaronkwhite/pm-toolkit/discussions)

## License

**PM Toolkit is Free Forever!** No read-only modes, no purchasing a license, pure unadulterated rich editing in your IDE.

- No trial period
- No yearly fee
- No read-only mode

MIT — see [LICENSE](LICENSE) for details.

---

Made for people who live in their editor.
