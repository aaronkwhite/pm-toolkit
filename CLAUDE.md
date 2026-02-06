# CLAUDE.md - Project Instructions

This file provides guidance for Claude Code when working on PM Toolkit.

## Project Overview

PM Toolkit is a Cursor extension providing:
- WYSIWYG Markdown editor with slash commands
- Kanban boards (markdown-based)
- File viewers (PDF, Word, Excel, CSV)
- Mermaid diagram rendering

**Target users**: Product managers and non-developers who want visual editing tools in Cursor.

## Versioning

This project uses **SemVer** (Semantic Versioning): `MAJOR.MINOR.PATCH`

- `MAJOR` - Breaking changes
- `MINOR` - New features (backwards compatible)
- `PATCH` - Bug fixes (backwards compatible)

### When to Update Version

| Change Type | Action |
|-------------|--------|
| Breaking change | Bump MAJOR |
| New feature | Bump MINOR |
| Bug fix | Bump PATCH |
| Documentation only | No version change needed |

**Version lives in**: `package.json` → `"version"`

### Release Checklist

When bumping the version, complete these steps:

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with new version section
3. **Commit** with message: `chore: bump version to X.Y.Z`
4. **Create git tag**: `git tag vX.Y.Z`
5. **Push with tags**: `git push && git push --tags`
6. **Create GitHub Release**:
   - Go to https://github.com/aaronkwhite/pm-toolkit/releases/new
   - Select the tag you just pushed
   - Title: `vX.Y.Z`
   - Description: Copy from CHANGELOG.md for this version
   - Attach `.vsix` file if publishing to marketplace

The README version badge auto-updates from GitHub releases.

## Project Structure

```
pm-toolkit/
├── src/                    # Extension code (Node.js, VS Code API)
│   ├── extension.ts        # Entry point
│   └── editors/            # Custom editor providers
├── webview/                # Webview UI code (browser environment)
│   ├── editor/             # Markdown editor (Tiptap)
│   ├── kanban/             # Kanban board
│   └── viewers/            # File viewers
├── tests/
│   └── e2e/                # Playwright E2E tests
├── docs/planning/          # Internal planning docs
└── dist/                   # Build output (gitignored)
```

## Tech Stack

- **Editor**: Tiptap (ProseMirror-based)
- **Drag-drop**: dnd-kit
- **Diagrams**: Mermaid.js
- **Icons**: Lucide
- **Build**: esbuild
- **Tests**: Playwright

## Development Commands

```bash
npm run compile      # Build extension
npm run watch        # Watch mode for development
npm run test:e2e     # Run Playwright tests
npm run test:e2e:ui  # Run tests with Playwright UI
```

## Code Conventions

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`
- Include `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>` when Claude contributes

### Styling
- Inline styles in TypeScript when CSS doesn't apply reliably in webviews
- Support both light and dark themes (check `document.body.classList.contains('vscode-dark')`)
- Use Lucide icons consistently

### Testing
- Write E2E tests for new features in `tests/e2e/`
- Use the `EditorHelper` page object pattern
- Run tests before committing significant changes

## Important Notes

- **Target Cursor**, not VS Code (though it's compatible with both)
- **User-focused**: Write for PMs, not developers
- **Plain text first**: Kanban and editor data stays in markdown

## GitHub

Repository: https://github.com/aaronkwhite/pm-toolkit
