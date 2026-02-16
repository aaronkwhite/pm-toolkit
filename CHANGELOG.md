# Changelog

All notable changes to PM Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.2] - 2026-02-16

### Fixed

- Extension failed to activate: `puppeteer-core` was marked as external in the build and not included in the `.vsix` package

## [0.7.1] - 2026-02-16

### Fixed

- Code blocks with blank lines (e.g., two class definitions separated by a blank line) no longer split into separate blocks when loaded or pasted

## [0.7.0] - 2026-02-16

### Added

- **PDF Export** — Export any markdown document to a pixel-perfect PDF via Command Palette or the editor title bar
  - Uses Chrome's rendering engine (via `puppeteer-core`) for output identical to the editor
  - Selectable text, proper tables, images, and Mermaid SVG diagrams
  - Auto-detects Chrome, Chromium, Edge, or Brave on macOS, Windows, and Linux
  - Configurable page size (A4, Letter, Legal, Tabloid), margins, and background printing
  - PDF saved next to the source `.md` file with "Open File" / "Open Folder" actions
  - Manual browser path override via `pmtoolkit.pdfChromePath` setting

## [0.6.0] - 2026-02-08

The biggest release yet. The entire editor has been rebuilt on React 18, images and tables got ground-up redesigns, and new features like block handles, document outline, and save validation make PM Toolkit feel like a proper writing tool.

### Added

- **Block handles** — Drag handles appear in the editor gutter on hover. Drag any block to reorder it; click `+` to insert new content between blocks. Right-click a table's grip handle for quick actions (clear contents, duplicate, delete)
- **Document outline** — Collapsible heading sidebar for navigating long documents at a glance
- **Save guard** — Every save is validated before it touches your file. Blocks corrupted content containing webview URIs, internal data attributes, or excessive HTML from ever reaching disk

- **Image system redesign** — Complete overhaul of the image experience:
  - Drop zone UI for empty images — drag a file, paste a URL, or browse with the VS Code file picker
  - Drag-to-resize handles with live preview
  - Popover toolbar on click for alignment (left/center/right), replace, and delete
  - Image captions that toggle on/off and map to markdown alt text
  - Width and alignment persisted as HTML comments in markdown
  - `imageAssetsPath` setting to control where uploaded images are saved

- **Table controls redesign** — Tables went from basic to best-in-class:
  - Grip handles on rows (left edge) and columns (top edge) for drag-to-reorder with drop indicators
  - Right-click context menus on grips for insert/delete operations, with header row toggle
  - Full-width/height pill bars on last row/column for quick expansion
  - Persisted column widths with horizontal scroll for wide tables
  - Click between adjacent tables to insert a paragraph (gap-click handler)
  - Select all cells + Delete removes the entire table

- **Mermaid fit-to-view** — Diagrams default to fit-to-view mode so the full diagram is always visible (toggle to scroll/zoom for large diagrams)
- **H4 support** — Heading 4 added to slash commands and bubble menu

- **React 18 architecture** — The entire editor UI has been migrated to React:
  - All interactive components rewritten: SlashCommand, ImageNode, MermaidNode, BlockHandle, DocumentOutline, BubbleMenu, LinkPicker, TableSizePicker
  - New `Editor.tsx` entry point with `@tiptap/react` integration
  - esbuild configured for JSX compilation
  - All icons now use proper `lucide` imports via shared `LucideIcon` component (eliminated ~200 lines of inline SVG strings)

- **285 E2E tests** — Up from 192. New coverage for images, tables, serialization, VS Code message handlers, settings, and save validation

### Changed

- **Theme-adaptive accent color** — Unified selection highlights, focus rings, and interactive elements under `--pmtoolkit-accent` CSS variable that adapts to light/dark themes
- **Consistent floating menus** — All floating menus (slash command, bubble menu, image popover, table context menu) now share consistent sizing: 12px font, 4px 8px padding, 6px border-radius
- **Cleaner add bars** — Table add-row/column bars only appear when hovering the last row/column (less visual noise)
- **Settings polish** — Toggle switches use theme variables instead of hardcoded colors
- **Branding cleanup** — Removed "Obsidian" and "Notion" references from descriptions and UI

### Fixed

- Block handle drag-and-drop works correctly with ProseMirror's native drag system
- Image serialization preserves width and alignment through markdown round-trips
- Caption toggle preserves alt text instead of deleting it
- External content updates no longer pollute the undo history
- Mermaid diagrams no longer enter edit mode on initial click
- Mermaid placeholder content resolved in directly-parsed nodes
- Template loading ported to React editor entry point
- Slash command menu positioning near editor edges

## [0.5.0] - 2026-02-05

### Added

- **Bubble menu**: Floating toolbar appears when text is selected with quick access to:
  - Block type dropdown (Text, Headings 1-3, Bullet/Numbered/Task lists, Quote, Code block)
  - Formatting buttons: Bold, Italic, Strikethrough, Inline code
  - Link button (integrates with file picker and URL form)
- Link slash command (`/link`) for inserting links to workspace files or URLs

## [0.4.7] - 2026-02-05

### Fixed

- Image markdown now converts to rendered image when pressing Enter (not just Space)
- Image markdown now converts when pasted from clipboard
- External image URLs (https://) now render immediately after editing via `/image` command

## [0.4.6] - 2026-02-05

### Changed

- Updated website URL to getpmtoolkit.com

## [0.4.5] - 2026-02-05

### Added

- Website link and badge in README
- Homepage field in package.json for OpenVSX verification
- "Free Forever" messaging in README

## [0.4.3] - 2026-02-04

### Changed

- Updated marketplace description and README
- Improved extension icon
- Updated test fixtures with Parks & Rec themed content
- Added image support documentation to README

## [0.4.2] - 2026-02-04

### Changed

- Fixed extension icon for marketplace display
- Updated publisher to `aaronkwhite`
- Added `.vscodeignore` to reduce package size (82MB → 6MB)
- Added repository URL to package.json

## [0.4.1] - 2026-02-02

### Added

- Settings panel E2E tests for comprehensive UI coverage

### Fixed

- Flaky test reliability improvements

### Documentation

- Updated README with new configuration options
- Updated planning docs for v0.4.x

## [0.4.0] - 2026-02-02

### Added

- **Settings Panel**: New dedicated settings UI accessible from editor menu or Command Palette
  - Organized sections for Editor, Templates, and Kanban settings
  - Browse button for template folder selection
  - Toggle switches and input fields for all options
  - "Buy Me a Coffee" support link

- **New Configuration Options**
  - `pmtoolkit.editorFontSize`: Font size for editor and kanban (10-24px)
  - `pmtoolkit.kanbanSaveDelay`: Delay before saving kanban changes (50-2000ms)
  - `pmtoolkit.kanbanDefaultColumns`: Default columns for new kanban boards
  - `pmtoolkit.kanbanShowThumbnails`: Toggle card thumbnail visibility

### Changed

- Settings command renamed to "PM Toolkit Settings" for clarity
- View Source icon stays in editor title bar
- Settings moved to editor overflow menu (`...`) for cleaner UI

## [0.3.0] - 2026-02-01

### Added

- **Template System**: Insert reusable templates via slash commands
  - Create templates as markdown files with YAML frontmatter
  - Dynamic variables: `{{date}}`, `{{time}}`, `{{datetime}}`, `{{year}}`, `{{month}}`, `{{day}}`
  - Auto-reload when template files change
  - New command: "PM Toolkit: Set Template Folder" with native folder picker
  - Configure via Settings or Command Palette

- **Mermaid Diagram Support**: Render diagrams directly in the editor
  - Flowcharts, sequence diagrams, class diagrams, Gantt charts, and more
  - Light/dark theme support matching your editor theme
  - Edit button to modify diagram source
  - Slash commands: `/diagram`, `/sequence`, `/class`, `/gantt`

- **Improved Keyboard Navigation**
  - Arrow keys now exit code blocks (Up at start, Down at end)
  - `Cmd+Enter` (`Ctrl+Enter` on Windows/Linux) exits code blocks and tables
  - Easier to add content before/after code blocks

### Changed

- View Source button now uses a cleaner 3-line icon

## [0.2.0] - 2026-01-30

### Added

- **Kanban Enhancements**
  - Card detail modal with rich text editing (Linear-style)
  - Card thumbnails showing first image from description
  - Column auto-complete setting (automatically check items moved to column)
  - Column settings menu (kebab dropdown)
  - Toggle thumbnails from editor title menu
  - Clipboard support for images in card editor

- **Table Size Picker**: Visual grid to select table dimensions when inserting tables

- **View Source Command**: Quickly view the raw markdown/kanban source

### Fixed

- Image serialization in kanban cards now preserves formatting
- Markdown stripping improved for cleaner card previews
- Heading escaping in card descriptions

## [0.1.0] - 2026-01-29

### Added

- **WYSIWYG Markdown Editor**
  - Rich text editing with live preview
  - Slash commands for quick formatting (`/heading`, `/list`, `/table`, etc.)
  - Table editing with Tab/Shift+Tab navigation
  - Task lists with checkboxes
  - Code blocks with syntax highlighting
  - Blockquotes and horizontal rules
  - Link insertion and editing
  - Light and dark theme support

- **Kanban Board**
  - Markdown-based boards (`.kanban` files)
  - Drag and drop cards between columns
  - Auto-complete when moving to "Done" or "Archive" columns
  - Archive column auto-hides when empty
  - Task count per column
  - Double-click to edit cards inline

- **File Viewers** (read-only)
  - **PDF Viewer**: Page navigation, zoom, rotation
  - **Word Viewer**: Renders `.docx` files with formatting
  - **Excel Viewer**: Sheet tabs, column/row headers, cell formatting
  - **CSV Viewer**: Auto-detect delimiters, sortable columns, header toggle

- **Custom File Icons**: Kanban files show dedicated icon in file explorer

[0.7.2]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.7.2
[0.7.1]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.7.1
[0.7.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.7.0
[0.6.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.6.0
[0.5.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.5.0
[0.4.7]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.7
[0.4.6]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.6
[0.4.5]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.5
[0.4.3]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.3
[0.4.2]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.2
[0.4.1]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.1
[0.4.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.0
[0.3.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.3.0
[0.2.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.2.0
[0.1.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.1.0
