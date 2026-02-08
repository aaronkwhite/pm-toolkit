# PM Toolkit - Testing Plan

> **Last Updated**: 2026-02-06
> **Test Framework**: Playwright
> **Total Tests**: 277 (all passing)
> **Test Runner**: `npm run test:e2e`

## Current Testing Architecture

All testing is done via **Playwright E2E tests** that run against a custom test harness serving the compiled webview in a browser. There are no unit tests (Vitest, Jest, etc.) — the E2E tests cover all functionality from rendering to serialization to VS Code message handling.

### Architecture

```
tests/
├── e2e/                          # Playwright E2E test specs (277 tests)
│   ├── editor-basic.spec.ts       # Basic editor loading, content, placeholders
│   ├── editor-formatting.spec.ts  # Bold, italic, strikethrough, code, links
│   ├── editor-cursor.spec.ts      # Cursor positioning, selection, bubble menu
│   ├── editor-lists.spec.ts       # Bullet, numbered, task lists, indent/outdent
│   ├── editor-tables.spec.ts      # Table creation, navigation, Tab/Shift+Tab
│   ├── editor-table-controls.spec.ts # Grippers, context menus, drag-to-reorder
│   ├── editor-slash.spec.ts       # Slash command menu, filtering, keyboard nav
│   ├── editor-mermaid.spec.ts     # Mermaid diagram rendering, edit mode, themes
│   ├── editor-codeblock-nav.spec.ts # Code block keyboard navigation (arrows, Cmd+Enter)
│   ├── editor-images.spec.ts      # Image rendering, deletion, local images
│   ├── editor-image-dropzone.spec.ts  # Drop zone UI, URL input, browse button
│   ├── editor-image-resize.spec.ts    # Resize handles, width persistence
│   ├── editor-image-popover.spec.ts   # Popover toolbar, alignment, replace, delete
│   ├── editor-image-caption.spec.ts   # Caption toggle, alt text persistence
│   ├── editor-image-bubblemenu.spec.ts # Image in bubble menu context
│   ├── editor-image-serialization.spec.ts # Markdown round-trip, metadata comments
│   ├── editor-image-vscode.spec.ts    # VS Code message handlers (save, picker, URL resolve)
│   ├── editor-undo-redo.spec.ts   # Undo/redo for text, formatting, lists
│   ├── editor-state-persistence.spec.ts # Content persistence across reloads
│   ├── editor-workflows.spec.ts   # Multi-step editing workflows
│   └── settings-panel.spec.ts    # Settings panel UI, controls, validation
├── harness/
│   ├── serve.ts                  # Express server (port 3333)
│   ├── test-harness.html         # Editor webview harness with mock VS Code API
│   └── settings-harness.html     # Settings panel harness
├── utils/
│   ├── editor-helper.ts          # EditorHelper page object (load, type, getContent, etc.)
│   └── vscode-mock.ts            # VS Code API mock utilities
└── playwright.config.ts          # Playwright configuration
```

### How It Works

1. **Build**: `npm run compile` compiles the extension and webview bundles to `dist/`
2. **Serve**: Express server (`tests/harness/serve.ts`) serves:
   - `/` → `test-harness.html` (loads `dist/webview/editor.js` + `dist/webview/editor.css`)
   - `/settings` → `settings-harness.html` (loads `dist/settings-panel.js`)
   - `/dist/*` → compiled assets
   - `/test-files/*` → test image files
3. **Test**: Playwright opens Chromium, navigates to `http://localhost:3333`, and interacts with the editor

### Test Harness

`test-harness.html` provides:
- Mock `acquireVsCodeApi()` that captures messages sent by the webview
- Mock `postMessage` handler that simulates VS Code extension responses
- Auto-response to `requestImageUrl` (echoes path back as `image-url-resolved` event)
- Message capture/retrieval via `_getMessages()`, `_getMessagesByType()`, `_clearMessages()`
- Content initialization via `init` message dispatch

### EditorHelper Page Object

`tests/utils/editor-helper.ts` provides a clean API for tests:

| Method | Description |
|--------|-------------|
| `load(content?)` | Navigate to harness, optionally init with content, clear messages |
| `simulateInit(content)` | Dispatch init message (for capturing messages during init) |
| `focus()` | Focus the ProseMirror editor |
| `type(text)` | Type text into the editor |
| `pressKey(key)` | Press a keyboard key |
| `getContent()` | Get serialized markdown from the editor |
| `getVisibleText()` | Get visible text content |
| `waitForSync()` | Wait for debounced content update message |
| `hasElement(selector)` | Check if a DOM element exists |
| `getMessages(type?)` | Get captured VS Code messages |
| `clearMessages()` | Clear captured messages |

### Configuration

```typescript
// tests/playwright.config.ts
{
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  timeout: 30000,
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run compile && npx tsx tests/harness/serve.ts',
    url: 'http://localhost:3333/health',
    reuseExistingServer: !process.env.CI,
  },
}
```

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with Playwright UI (visual debugger)
npm run test:e2e:ui

# Run a specific test file
npx playwright test tests/e2e/editor-images.spec.ts --config tests/playwright.config.ts

# Run with headed browser (visible)
npx playwright test --headed --config tests/playwright.config.ts
```

### Test Coverage by Feature

| Feature | Test File(s) | Tests |
|---------|-------------|-------|
| Basic editor | editor-basic | ~15 |
| Text formatting | editor-formatting | ~20 |
| Cursor/selection | editor-cursor | ~13 |
| Lists | editor-lists | ~25 |
| Tables | editor-tables, editor-table-controls | ~30 |
| Slash commands | editor-slash | ~21 |
| Mermaid diagrams | editor-mermaid | ~17 |
| Code block nav | editor-codeblock-nav | ~8 |
| Images | editor-images, editor-image-* (6 files) | ~50 |
| Undo/redo | editor-undo-redo | ~12 |
| State persistence | editor-state-persistence | ~6 |
| Workflows | editor-workflows | ~10 |
| Settings panel | settings-panel | ~22 |

### Patterns and Conventions

**Test structure**: Each spec uses `test.describe` blocks grouped by feature area, with `test.beforeEach` calling `editor = createEditorHelper(page)`.

**Waiting for state**: Use `editor.waitForSync()` after content changes, or `page.waitForTimeout(ms)` for UI transitions (popover appearance, etc.). Prefer Playwright auto-waiting assertions (`toBeVisible`, `toHaveCount`, `toHaveAttribute`) over manual timeouts.

**Image tests**: Use `toHaveCount(1)` instead of `toBeVisible()` for images, since test images may not load (0 dimensions) but exist in the DOM.

**Message capture**: Call `editor.clearMessages()` before the action you want to capture, then `editor.getMessages('messageType')` to verify.

**File naming**: `*.spec.ts` for all test files.

---

## Future Improvements

- [ ] **Unit tests**: Add Vitest for pure logic (kanban parser, template variables, image serialization)
- [ ] **CI pipeline**: GitHub Actions workflow for automated test runs
- [ ] **Visual regression**: Screenshot comparison for UI components
- [ ] **Cross-browser**: Test in Firefox/WebKit (currently Chromium only)
- [ ] **Performance tests**: Large file handling, typing latency benchmarks

---
---

## Archive: Original Testing Plan (2026-01-29)

> The plan below was written during initial project planning. It proposed a Vitest + @vscode/test-electron architecture that was never implemented. The project went with Playwright E2E tests instead, which proved sufficient for the webview-heavy architecture. Kept here for reference.

---

# PM Toolkit - Comprehensive Testing Plan (Original)

## Executive Summary

This testing plan defines a world-class testing architecture for PM Toolkit, a VS Code extension providing WYSIWYG markdown editing, kanban boards, and file viewers. The plan prioritizes **high-signal, low-noise tests** that protect users from regressions and developers from wasted time.

### Core Principles

1. **Testing Pyramid**: Heavy investment at the base (unit/integration), surgical investment at the top (E2E)
2. **Mocks are Privileged**: Every mock must be verified against reality and justified
3. **Fast Feedback**: Local test runs under 60 seconds, CI under 10 minutes
4. **No Flaky Tests**: Deterministic by design, quarantine aggressively, delete mercilessly

---

## Testing Architecture Overview

```
pm-toolkit/
├── src/
│   └── test/                      # Extension-side tests
│       ├── unit/                  # Pure logic tests
│       │   ├── parsers/
│       │   ├── templates/
│       │   └── utils/
│       ├── integration/           # VS Code API integration
│       │   ├── editors/
│       │   ├── viewers/
│       │   └── commands/
│       └── e2e/                   # Full extension tests
│           ├── fixtures/
│           └── *.test.ts
├── webview/
│   └── test/                      # Webview-side tests
│       ├── unit/
│       │   ├── kanban/
│       │   ├── editor/
│       │   └── viewers/
│       ├── integration/
│       │   └── messaging/
│       └── e2e/
│           └── browser/
├── test/
│   ├── fixtures/                  # Shared test data
│   │   ├── markdown/
│   │   ├── kanban/
│   │   ├── templates/
│   │   └── files/                 # PDF, DOCX, XLSX, CSV samples
│   ├── mocks/                     # Verified mocks
│   │   ├── vscode/
│   │   └── contracts/             # Contract tests live here
│   └── helpers/                   # Test utilities
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Main CI pipeline
│       └── release.yml            # Pre-release testing
└── vitest.config.ts               # Test configuration
```

---

## 1. Unit Testing Strategy

### Framework: Vitest

**Why Vitest over Jest:**
- Native ESM support (critical for modern packages like Tiptap, dnd-kit)
- Faster execution (native Vite bundling)
- Compatible with Jest API (migration path)
- Better TypeScript integration out of the box
- Watch mode with instant feedback

```json
// package.json (devDependencies)
{
  "@vitest/coverage-v8": "^2.x",
  "@vitest/ui": "^2.x",
  "vitest": "^2.x",
  "happy-dom": "^15.x"
}
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Extension tests
    include: ['src/**/*.test.ts', 'webview/**/*.test.ts'],
    exclude: ['**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'webview/**/*.ts'],
      exclude: ['**/*.test.ts', '**/types/**'],
      thresholds: {
        lines: 70,
        branches: 60,
        functions: 70,
        statements: 70
      }
    },
    setupFiles: ['./test/setup.ts'],
    testTimeout: 5000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@webview': path.resolve(__dirname, 'webview'),
      '@test': path.resolve(__dirname, 'test')
    }
  }
});
```

## 2-10. [Remaining sections omitted for brevity — see git history for full original document]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-29 | Testing Architect | Initial plan (Vitest + @vscode/test-electron) |
| 2.0 | 2026-02-06 | Claude | Rewritten to document actual Playwright E2E architecture |
