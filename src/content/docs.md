# Documentation

Everything you need to get started with PM Toolkit — the visual markdown editor for Cursor and VS Code.

## Getting Started

### Installation

Install PM Toolkit from the marketplace:

- **Cursor**: Open the Extensions panel (`Cmd+Shift+X`), search for "PM Toolkit", and click **Install**
- **VS Code**: Same steps, or install from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=aaronkwhite.pm-toolkit)
- **Open VSX**: Available on [Open VSX](https://open-vsx.org/extension/aaronkwhite/pm-toolkit) for alternative editors

### Opening the Editor

Open any `.md` file and PM Toolkit automatically activates. You'll see the visual editor instead of raw markdown. To switch back to the source view, click the **View Source** button in the editor toolbar.

## Visual Editor

PM Toolkit gives you a full WYSIWYG editing experience for markdown files. Type naturally and see formatted output in real time — headings, bold, italic, lists, links, and more render instantly.

The editor supports all standard markdown syntax. You can also use keyboard shortcuts for common formatting:

- **Bold**: `Cmd+B`
- **Italic**: `Cmd+I`
- **Strikethrough**: `Cmd+Shift+X`
- **Inline code**: `Cmd+E`
- **Link**: `Cmd+K`

### Bubble Menu

Select any text to see the floating toolbar. It gives quick access to:

- Block type (paragraph, headings, lists, quote, code block)
- Text formatting (bold, italic, strikethrough, code)
- Link insertion

## Slash Commands

Type `/` at the beginning of a new line to open the command menu. Available commands:

| Command | Description |
|---------|-------------|
| `/heading1` - `/heading3` | Insert headings |
| `/bullet` | Bullet list |
| `/numbered` | Numbered list |
| `/task` | Task list with checkboxes |
| `/table` | Insert a table (with size picker) |
| `/code` | Code block |
| `/quote` | Blockquote |
| `/divider` | Horizontal rule |
| `/image` | Insert an image |
| `/link` | Insert a link |
| `/mermaid` | Mermaid diagram |
| `/flowchart` | Mermaid flowchart |
| `/sequence` | Mermaid sequence diagram |

Templates you've created also appear in the slash command menu.

## Tables

Insert a table with `/table` and pick dimensions from the visual grid. Once inserted:

- **Tab** moves to the next cell, **Shift+Tab** moves back
- Grip controls on rows and columns let you add, delete, or reorder
- **Cmd+Enter** exits the table to continue writing below

## Images

PM Toolkit supports full image editing:

- **Drop** image files directly into the editor
- **Paste** images from your clipboard
- **Browse** for files using the file picker
- **URL**: Enter a web URL to embed an external image

Once inserted, click an image to:

- **Resize** by dragging corner handles
- **Align** left, center, or right using the floating toolbar
- **Replace** or **delete** from the popover menu

Images are saved alongside your markdown file in the workspace.

## Kanban Boards

Create a file with the `.kanban` extension to open a kanban board. Boards are stored as markdown, so they're portable and version-control friendly.

- Drag and drop cards between columns
- Double-click a card to edit with rich text (Linear-style modal)
- Cards auto-complete when moved to "Done" or "Archive" columns
- Task counts shown per column
- Thumbnails display the first image from card descriptions
- Configure default columns and save delay in settings

## Mermaid Diagrams

Write mermaid diagrams inside fenced code blocks marked **mermaid** and they render inline. Alternatively, use slash commands:

- `/mermaid` — Generic mermaid block
- `/flowchart` — Flowchart diagram
- `/sequence` — Sequence diagram

Diagrams automatically adapt to your light/dark theme. Click the **Edit** button on any diagram to modify the source.

## Document Outline

The sidebar shows a document outline generated from your headings. Click any heading in the outline to jump to that section. The outline updates in real time as you edit.

## Templates

Create reusable document templates:

1. Create a folder for your templates (any location in your workspace)
2. Set the folder path via **PM Toolkit: Set Template Folder** in the Command Palette, or in Settings
3. Add `.md` files with YAML frontmatter:

```yaml
---
title: Meeting Notes
description: Template for team meetings
---

# Meeting Notes — {{date}}

## Attendees

-

## Agenda

1.

## Action Items

- [ ]
```

Available variables:

| Variable | Output |
|----------|--------|
| `{{date}}` | Current date (e.g., 2026-02-08) |
| `{{time}}` | Current time (e.g., 14:30) |
| `{{datetime}}` | Date and time |
| `{{year}}` | Current year |
| `{{month}}` | Current month |
| `{{day}}` | Current day |

Templates appear in the slash command menu alongside built-in commands.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+B` | Bold |
| `Cmd+I` | Italic |
| `Cmd+E` | Inline code |
| `Cmd+K` | Insert link |
| `Cmd+Shift+X` | Strikethrough |
| `Cmd+Shift+7` | Numbered list |
| `Cmd+Shift+8` | Bullet list |
| `Cmd+Shift+9` | Task list |
| `Tab` | Indent / next table cell |
| `Shift+Tab` | Outdent / previous table cell |
| `Cmd+Enter` | Exit code block or table |
| `/` | Open slash command menu |

On Windows/Linux, replace `Cmd` with `Ctrl`.

## File Viewers

PM Toolkit includes read-only viewers for common file formats:

- **PDF**: Page navigation, zoom, and rotation
- **Word (.docx)**: Renders documents with formatting preserved
- **Excel (.xlsx)**: Sheet tabs, column/row headers, cell formatting
- **CSV**: Auto-detects delimiters, sortable columns, header toggle

## Settings

Open settings via the editor overflow menu (`...`) or run **PM Toolkit Settings** from the Command Palette.

| Setting | Description | Default |
|---------|-------------|---------|
| `pmtoolkit.editorFontSize` | Font size (10-24px) | 16 |
| `pmtoolkit.templateFolder` | Path to template folder | — |
| `pmtoolkit.kanbanSaveDelay` | Save delay in ms (50-2000) | 300 |
| `pmtoolkit.kanbanDefaultColumns` | Default board columns | To Do, In Progress, Done |
| `pmtoolkit.kanbanShowThumbnails` | Show card thumbnails | true |

## FAQ

### The editor doesn't load when I open a markdown file

PM Toolkit activates when you open a `.md` file, but if the file was already open before installing the extension, VS Code won't automatically switch to the visual editor. **Close the file tab and reopen it** — the editor will load on the second open. You can also right-click the file tab, choose **Reopen Editor With**, and select **PM Toolkit**.

### Cursor shows an error after AI edits my markdown file

Cursor applies diffs to files lazily — when its AI agent edits a file, the changes are staged as pending diffs rather than written directly. If a custom editor (like PM Toolkit's visual editor) is open when this happens, the document state can get out of sync and you'll see an assertion error on reload.

**To fix it:** save your document before letting Cursor's AI edit it. If you've already hit the error, switch to the source markdown view (right-click the tab and choose **Reopen Editor With** > **Text Editor**), accept or reject the pending diffs, then reopen the file to load the visual editor again.

### Can I switch between the visual editor and raw markdown?

Yes. Click the **View Source** button in the editor toolbar to see the raw markdown. Your changes are saved to the same file either way.

### Where are my files stored?

PM Toolkit edits your actual `.md` files on disk. Nothing is stored in a database or synced to the cloud. Your files stay exactly where you put them — portable, version-controllable, and fully yours.

### Does PM Toolkit work with Git?

Yes. Since it reads and writes standard markdown files, everything works with Git out of the box. Diffs, branches, merges — all normal.

### How much does PM Toolkit cost?

Nothing. PM Toolkit is completely free and open source. No trials, no tiers, no catch.

### How do I report a bug or request a feature?

Open an issue on [GitHub](https://github.com/aaronkwhite/pm-toolkit/issues).