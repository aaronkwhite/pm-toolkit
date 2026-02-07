# Changelog

All notable changes to PM Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Table drag-to-reorder**: Grip handles on rows (left edge) and columns (top edge) for drag-and-drop reordering with drop indicator lines
- **Table context menus**: Right-click on row/column grips for insert/delete operations
- **Table add bars**: Full-width/height pill bars on last row/column for quick table expansion
- **Table column widths**: Persisted column widths with horizontal scroll for wide tables
- **Image redesign**: Complete image system overhaul with React NodeView
  - Drop zone for empty images (file drop, URL input, browse button)
  - Resize handles with pointer-event-based dragging
  - Popover toolbar for alignment (left/center/right), replace, and delete
  - Width and alignment persisted as HTML comments in markdown
  - VS Code file picker integration for browsing local images
  - Relative path resolution via VS Code webview URI conversion
- **Image captions**: Toggle captions on images via the popover toolbar
- **Block handles**: Drag handles in the editor gutter for reordering any block
- **Document outline**: Floating outline panel for quick heading navigation
- **H4 support**: Added Heading 4 to slash commands and bubble menu
- **`imageAssetsPath` setting**: Configure where uploaded images are saved (relative to the document)
- **React migration**: Editor UI migrated to React components (SlashCommand, ImageNode, MermaidNode, BlockHandle, DocumentOutline)
- **277 E2E tests**: Comprehensive test coverage for images, tables, serialization, VS Code handlers, and settings

### Changed

- **Floating menus aligned**: All floating menus (slash command, bubble menu, image popover, table context menu) use consistent 12px font, 4px 8px padding, 6px border-radius
- **Branding cleanup**: Removed "Obsidian" and "Notion" references from descriptions and UI
- **Settings panel**: Toggle switches now use theme variables instead of hardcoded colors
- **Add-row/column bars**: Only show when hovering the last row/column (less visual noise)

### Fixed

- Block handle drag-and-drop works correctly with ProseMirror's native drag system
- Image serialization preserves width and alignment through markdown round-trips
- External content updates no longer pollute the undo history
- Mermaid diagrams no longer enter edit mode on initial click

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

[0.4.3]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.3
[0.4.2]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.2
[0.4.1]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.1
[0.4.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.4.0
[0.3.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.3.0
[0.2.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.2.0
[0.1.0]: https://github.com/aaronkwhite/pm-toolkit/releases/tag/v0.1.0
