# Changelog

All notable changes to PM Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
