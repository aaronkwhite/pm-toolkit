# Link Command Design

**Date:** 2026-02-05
**Version:** 0.4.7

## Overview

A `/link` slash command for inserting links to workspace files or external URLs.

## Entry Points

### 1. Slash Command

Type `/link` in the editor to show initial menu:

| Option | Icon | Description |
| --- | --- | --- |
| Link to file | 🔗 | Search and link to a document |
| Link to URL | 🌐 | Link to an external URL |

### 2. Wiki-Link Trigger (`[[`)

Typing `[[` anywhere in the editor (except code blocks) triggers the file picker directly, skipping the menu. This matches Obsidian's wiki-link syntax.

**Flow:**
1. User types `[[`
2. The `[[` characters are deleted
3. File picker opens immediately at cursor position
4. User searches/selects a file
5. Inserts: `[filename](../relative/path/to/file.md)`

**Implementation:**
- Listen for `input` events in the editor
- Track last two characters typed
- When `[[` is detected:
  - Check if cursor is inside a code block (skip if so)
  - Delete the `[[` characters
  - Insert a hidden marker span at cursor position
  - Request files from extension
  - Show file picker when files arrive
- On file selection, replace marker with link

**Code block detection:**
- Check if cursor is inside `[data-type="code-block"]`
- Check if cursor is inside `pre > code` elements
- Skip wiki-link trigger if inside code

## Link to File Flow

1. User selects "Link to file"
2. Menu updates to show:
   - Search input (placeholder: "Search files...")
   - List of up to 20 most recently modified files
3. Each file shows filename and relative path
4. User searches/selects a file
5. Inserts: `[filename](../relative/path/to/file.md)`

## Link to URL Flow

1. User selects "Link to URL"
2. Inline form appears with:
   - URL input (placeholder: `https://...`)
   - Display text input (placeholder: `Link text`, defaults to URL value)
3. User fills in fields and submits
4. Inserts: `[display text](url)`

## Implementation

### Webview (SlashCommand.ts)

- Add `/link` command with sub-menu
- "Link to file" shows file picker (reuses slash menu styling)
- "Link to URL" shows inline form
- Both insert markdown link on completion

### Extension

- New message: `requestFiles` - webview requests workspace files
- New message: `files` - extension responds with file list
- File list includes: path, name, modified time
- Returns up to 20 most recently modified files
- Searches all file types

### Message Types

```typescript
// Webview → Extension
{ type: 'requestFiles', payload: { search?: string } }

// Extension → Webview
{ type: 'files', payload: { files: Array<{ name: string, path: string, relativePath: string }> } }
```

## Markdown Output

```markdown
[2024-03-01-retro](../meetings/2024-03-01-retro.md)
[Example Site](https://example.com)
```

- File links use relative paths from current document
- Link text for files = filename without extension
- Link text for URLs = URL (user can edit)

## File Filtering

Current implementation searches all file types (`**/*`). Consider filtering to markdown files only:

| Option | Pattern | Pros | Cons |
| --- | --- | --- | --- |
| All files | `**/*` | Link to any file | Cluttered results |
| Markdown only | `**/*.md` | Clean, focused | Can't link to other docs |
| Documents | `**/*.{md,pdf,docx}` | Common doc types | May miss some |

**Recommendation:** Keep all files but increase limit from 20 (500 files, sorted by recency).
