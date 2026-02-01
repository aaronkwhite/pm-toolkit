# PM Toolkit

A VS Code / Cursor extension that brings visual editing tools to your workflow. Write documentation, manage tasks, and view files—all without leaving your editor.

## Features

### WYSIWYG Markdown Editor

Edit markdown files visually. What you see is what you get—no more switching between raw text and preview.

- **Slash commands** — Type `/` to insert headings, lists, tables, code blocks, and more
- **Rich formatting** — Bold, italic, links, and images with familiar keyboard shortcuts
- **Tables** — Create and edit tables visually
- **Task lists** — Interactive checkboxes that save to standard markdown
- **Mermaid diagrams** — Flowcharts, sequence diagrams, and more render inline

### Kanban Boards

Turn any markdown file into a visual task board. Your data stays in plain text—always portable, always yours.

- **Drag and drop** — Move cards between columns
- **Card details** — Click to expand and edit with full formatting
- **Image support** — Paste images directly into cards
- **Auto-complete columns** — Cards automatically mark as done when moved
- **Thumbnails** — See image previews on cards

Create a `.kanban` file or right-click any `.md` file and select "Open as Kanban Board."

### File Viewers

View common file types without leaving your editor:

- **PDF** — Page navigation, zoom, rotation
- **Word (.docx)** — View documents with formatting preserved
- **Excel (.xlsx)** — Browse spreadsheets with sheet tabs
- **CSV/TSV** — Sortable tables with auto-detected delimiters

## Installation

### From VS Code Marketplace

Search for "PM Toolkit" in the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`).

### From VSIX

1. Download the `.vsix` file from [Releases](../../releases)
2. In VS Code: `Extensions` → `...` → `Install from VSIX`

## Getting Started

### Markdown Editing

1. Open any `.md` file
2. Start typing—formatting appears as you write
3. Type `/` at the start of a line to see available blocks

**Keyboard shortcuts:**
- `Cmd/Ctrl + B` — Bold
- `Cmd/Ctrl + I` — Italic
- `Cmd/Ctrl + Z` — Undo
- `Cmd/Ctrl + Shift + Z` — Redo

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

## Configuration

Access settings via `Code` → `Settings` → `Extensions` → `PM Toolkit`.

| Setting | Description |
|---------|-------------|
| `pmtoolkit.templateFolder` | Path to folder containing template markdown files |

## Built With

PM Toolkit is built on solid open-source foundations:

| Library | Purpose | License |
|---------|---------|---------|
| [Tiptap](https://tiptap.dev) | Rich text editor framework | MIT |
| [ProseMirror](https://prosemirror.net) | Editor toolkit (powers Tiptap) | MIT |
| [dnd-kit](https://dndkit.com) | Drag and drop | MIT |
| [Mermaid](https://mermaid.js.org) | Diagrams from text | MIT |
| [PDF.js](https://mozilla.github.io/pdf.js/) | PDF rendering | Apache 2.0 |
| [Mammoth](https://github.com/mwilliamson/mammoth.js) | Word document conversion | BSD-2 |
| [SheetJS](https://sheetjs.com) | Excel parsing | Apache 2.0 |
| [Papa Parse](https://www.papaparse.com) | CSV parsing | MIT |

## Contributing

Contributions are welcome! Please:

1. Check [existing issues](../../issues) before opening a new one
2. For bugs, include steps to reproduce and your environment details
3. For features, describe the use case and why it would help

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd pm-toolkit

# Install dependencies
npm install

# Start development (watches for changes)
npm run watch

# In VS Code: Press F5 to launch Extension Development Host
```

### Running Tests

```bash
# Run all e2e tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui
```

## Support

- **Bug reports** — [Open an issue](../../issues/new?template=bug_report.md)
- **Feature requests** — [Open an issue](../../issues/new?template=feature_request.md)
- **Questions** — [Start a discussion](../../discussions)

## License

MIT — see [LICENSE](LICENSE) for details.

---

Made for people who live in their editor.
