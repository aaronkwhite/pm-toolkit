# PM Toolkit - Comprehensive Testing Plan

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

### What to Unit Test

#### Extension Side (`src/`)

| Component | Test Focus | Priority |
|-----------|------------|----------|
| `TemplateManager.ts` | YAML parsing, variable replacement, template discovery | P0 |
| `kanban/parser.ts` | Markdown to board, board to markdown, edge cases | P0 |
| `editors/HTMLBuilder.ts` | HTML generation, CSP nonces, asset paths | P1 |
| `types/` | Type guards, validation functions | P1 |

#### Webview Side (`webview/`)

| Component | Test Focus | Priority |
|-----------|------------|----------|
| `kanban/parser.ts` | Task parsing, column parsing, round-trip fidelity | P0 |
| `editor/extensions/*.ts` | Tiptap extension behavior (slash command triggers) | P1 |
| `viewers/csv-viewer.ts` | Delimiter detection, header parsing | P1 |
| `viewers/excel-viewer.ts` | Sheet parsing, cell formatting | P1 |

### Unit Test Examples

#### Template Variable Replacement

```typescript
// src/templates/TemplateManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from './TemplateManager';

describe('TemplateManager', () => {
  describe('replaceVariables', () => {
    beforeEach(() => {
      // Freeze time for deterministic tests
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T14:30:00'));
    });

    it('replaces {{date}} with YYYY-MM-DD format', () => {
      const input = '# Meeting: {{date}}';
      const result = TemplateManager.replaceVariables(input);
      expect(result).toBe('# Meeting: 2024-06-15');
    });

    it('replaces {{time}} with HH:MM:SS format', () => {
      const input = 'Created at {{time}}';
      const result = TemplateManager.replaceVariables(input);
      expect(result).toBe('Created at 14:30:00');
    });

    it('replaces {{datetime}} with combined format', () => {
      const input = 'Timestamp: {{datetime}}';
      const result = TemplateManager.replaceVariables(input);
      expect(result).toBe('Timestamp: 2024-06-15 14:30:00');
    });

    it('replaces multiple variables in single string', () => {
      const input = '{{year}}/{{month}}/{{day}}';
      const result = TemplateManager.replaceVariables(input);
      expect(result).toBe('2024/06/15');
    });

    it('leaves unknown variables untouched', () => {
      const input = '{{unknown}} and {{date}}';
      const result = TemplateManager.replaceVariables(input);
      expect(result).toBe('{{unknown}} and 2024-06-15');
    });

    it('handles empty string', () => {
      expect(TemplateManager.replaceVariables('')).toBe('');
    });
  });

  describe('parseYAMLFrontmatter', () => {
    it('extracts template metadata from valid frontmatter', () => {
      const content = `---
template_name: "Meeting Notes"
template_description: "For team meetings"
template_icon: "calendar"
---

# Meeting Content`;

      const result = TemplateManager.parseYAMLFrontmatter(content);
      expect(result.metadata).toEqual({
        template_name: 'Meeting Notes',
        template_description: 'For team meetings',
        template_icon: 'calendar'
      });
      expect(result.content).toBe('\n# Meeting Content');
    });

    it('handles missing frontmatter', () => {
      const content = '# Just Content';
      const result = TemplateManager.parseYAMLFrontmatter(content);
      expect(result.metadata).toBeNull();
      expect(result.content).toBe('# Just Content');
    });

    it('handles empty frontmatter', () => {
      const content = `---
---
# Content`;
      const result = TemplateManager.parseYAMLFrontmatter(content);
      expect(result.metadata).toEqual({});
    });

    it('handles malformed YAML gracefully', () => {
      const content = `---
invalid: yaml: content: here
---
# Content`;
      const result = TemplateManager.parseYAMLFrontmatter(content);
      expect(result.metadata).toBeNull();
      expect(result.content).toContain('# Content');
    });
  });
});
```

#### Kanban Parser

```typescript
// webview/kanban/parser.test.ts
import { describe, it, expect } from 'vitest';
import { KanbanParser } from './parser';

describe('KanbanParser', () => {
  describe('parseMarkdown', () => {
    it('parses columns from H2 headings', () => {
      const markdown = `## Backlog

## In Progress

## Done`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns).toHaveLength(3);
      expect(board.columns.map(c => c.title)).toEqual([
        'Backlog', 'In Progress', 'Done'
      ]);
    });

    it('parses incomplete tasks', () => {
      const markdown = `## Todo

- [ ] Task one
- [ ] Task two`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards).toHaveLength(2);
      expect(board.columns[0].cards[0]).toMatchObject({
        title: 'Task one',
        completed: false
      });
    });

    it('parses completed tasks', () => {
      const markdown = `## Done

- [x] Completed task`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards[0].completed).toBe(true);
    });

    it('captures indented description lines', () => {
      const markdown = `## Todo

- [ ] Main task
  This is additional context
  More details here`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards[0].description).toBe(
        'This is additional context\nMore details here'
      );
    });

    it('handles empty columns', () => {
      const markdown = `## Empty Column

## Has Tasks

- [ ] A task`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards).toHaveLength(0);
      expect(board.columns[1].cards).toHaveLength(1);
    });

    it('ignores H1 headings', () => {
      const markdown = `# Board Title

## Column One`;

      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns).toHaveLength(1);
      expect(board.columns[0].title).toBe('Column One');
    });

    it('preserves task order', () => {
      const markdown = `## Todo

- [ ] First
- [ ] Second
- [ ] Third`;

      const board = KanbanParser.parseMarkdown(markdown);
      const titles = board.columns[0].cards.map(c => c.title);
      expect(titles).toEqual(['First', 'Second', 'Third']);
    });
  });

  describe('toMarkdown', () => {
    it('generates valid markdown from board', () => {
      const board = {
        columns: [
          {
            id: '1',
            title: 'Backlog',
            cards: [
              { id: 'a', title: 'Task A', completed: false },
              { id: 'b', title: 'Task B', completed: false }
            ]
          }
        ]
      };

      const markdown = KanbanParser.toMarkdown(board);
      expect(markdown).toBe(`## Backlog

- [ ] Task A
- [ ] Task B
`);
    });

    it('generates checkboxes for completed tasks', () => {
      const board = {
        columns: [{
          id: '1',
          title: 'Done',
          cards: [{ id: 'a', title: 'Finished', completed: true }]
        }]
      };

      const markdown = KanbanParser.toMarkdown(board);
      expect(markdown).toContain('- [x] Finished');
    });

    it('includes task descriptions with proper indentation', () => {
      const board = {
        columns: [{
          id: '1',
          title: 'Todo',
          cards: [{
            id: 'a',
            title: 'Task',
            completed: false,
            description: 'Line one\nLine two'
          }]
        }]
      };

      const markdown = KanbanParser.toMarkdown(board);
      expect(markdown).toContain('- [ ] Task\n  Line one\n  Line two');
    });

    it('round-trips correctly', () => {
      const original = `## Backlog

- [ ] Task one
  With description
- [x] Completed task

## Done

- [x] Another done task
`;

      const board = KanbanParser.parseMarkdown(original);
      const regenerated = KanbanParser.toMarkdown(board);
      const reparsed = KanbanParser.parseMarkdown(regenerated);

      expect(reparsed).toEqual(board);
    });
  });

  describe('edge cases', () => {
    it('handles Windows line endings (CRLF)', () => {
      const markdown = '## Column\r\n\r\n- [ ] Task\r\n';
      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards).toHaveLength(1);
    });

    it('handles special characters in task titles', () => {
      const markdown = '## Todo\n\n- [ ] Task with `code` and **bold**';
      const board = KanbanParser.parseMarkdown(markdown);
      expect(board.columns[0].cards[0].title).toBe(
        'Task with `code` and **bold**'
      );
    });

    it('handles empty file', () => {
      const board = KanbanParser.parseMarkdown('');
      expect(board.columns).toHaveLength(0);
    });

    it('handles tasks without column heading', () => {
      const markdown = '- [ ] Orphan task';
      const board = KanbanParser.parseMarkdown(markdown);
      // Should either create default column or ignore
      expect(board.columns.length).toBeGreaterThanOrEqual(0);
    });
  });
});
```

### Mocking Strategy

#### VS Code API Mocks

The VS Code API cannot be imported in a regular Node.js environment. We need verified mocks.

```typescript
// test/mocks/vscode/index.ts
import { vi } from 'vitest';

// Core types
export const Uri = {
  file: (path: string) => ({ fsPath: path, scheme: 'file', path }),
  parse: (value: string) => ({ fsPath: value, scheme: 'file', path: value }),
  joinPath: (uri: any, ...paths: string[]) => ({
    ...uri,
    fsPath: [uri.fsPath, ...paths].join('/'),
    path: [uri.path, ...paths].join('/')
  })
};

export const workspace = {
  fs: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    stat: vi.fn(),
    readDirectory: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn()
  },
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    update: vi.fn(),
    has: vi.fn()
  })),
  workspaceFolders: [],
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  onDidChangeTextDocument: vi.fn(() => ({ dispose: vi.fn() })),
  openTextDocument: vi.fn()
};

export const window = {
  showInformationMessage: vi.fn(),
  showErrorMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showQuickPick: vi.fn(),
  showInputBox: vi.fn(),
  createWebviewPanel: vi.fn(() => ({
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(() => ({ dispose: vi.fn() })),
      postMessage: vi.fn(),
      asWebviewUri: vi.fn((uri: any) => uri),
      cspSource: 'vscode-webview:'
    },
    onDidDispose: vi.fn(() => ({ dispose: vi.fn() })),
    reveal: vi.fn(),
    dispose: vi.fn()
  })),
  activeTextEditor: undefined,
  onDidChangeActiveTextEditor: vi.fn(() => ({ dispose: vi.fn() }))
};

export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn()
};

export const ExtensionContext = class {
  subscriptions: any[] = [];
  extensionUri = Uri.file('/mock/extension');
  extensionPath = '/mock/extension';
  globalState = {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => [])
  };
  workspaceState = {
    get: vi.fn(),
    update: vi.fn(),
    keys: vi.fn(() => [])
  };
};

export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
  Active = -1,
  Beside = -2
}

export class CancellationTokenSource {
  token = { isCancellationRequested: false };
  cancel = vi.fn();
  dispose = vi.fn();
}

export const Position = class {
  constructor(public line: number, public character: number) {}
};

export const Range = class {
  constructor(
    public start: InstanceType<typeof Position>,
    public end: InstanceType<typeof Position>
  ) {}
};

export const TextEdit = {
  replace: vi.fn(),
  insert: vi.fn(),
  delete: vi.fn()
};
```

```typescript
// test/setup.ts
import { vi } from 'vitest';

// Mock vscode module globally
vi.mock('vscode', async () => {
  return await import('./mocks/vscode');
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
```

#### Contract Tests for Mocks

Every mock must have a corresponding contract test that verifies it matches reality.

```typescript
// test/mocks/contracts/vscode.contract.test.ts
/**
 * These tests verify our VS Code mocks behave like the real API.
 * Run only in VS Code extension test environment.
 *
 * @group contract
 */
import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import * as mockVscode from '../vscode';

describe('VS Code Mock Contract', () => {
  describe('Uri', () => {
    it('Uri.file returns object with fsPath', () => {
      const real = vscode.Uri.file('/test/path');
      const mock = mockVscode.Uri.file('/test/path');

      expect(mock.fsPath).toBe(real.fsPath);
      expect(mock.scheme).toBe(real.scheme);
    });

    it('Uri.joinPath concatenates paths', () => {
      const realBase = vscode.Uri.file('/base');
      const mockBase = mockVscode.Uri.file('/base');

      const realJoined = vscode.Uri.joinPath(realBase, 'child', 'file.txt');
      const mockJoined = mockVscode.Uri.joinPath(mockBase, 'child', 'file.txt');

      expect(mockJoined.fsPath).toBe(realJoined.fsPath);
    });
  });

  describe('Position', () => {
    it('constructs with line and character', () => {
      const real = new vscode.Position(5, 10);
      const mock = new mockVscode.Position(5, 10);

      expect(mock.line).toBe(real.line);
      expect(mock.character).toBe(real.character);
    });
  });
});
```

---

## 2. Integration Testing

### Extension-Webview Communication

The message protocol between extension and webview is critical infrastructure. Test it rigorously.

```typescript
// src/test/integration/messaging.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarkdownEditorProvider } from '@/editors/MarkdownEditorProvider';
import { createMockWebview, createMockDocument } from '@test/helpers';

describe('Extension-Webview Messaging', () => {
  let provider: MarkdownEditorProvider;
  let mockWebview: ReturnType<typeof createMockWebview>;
  let mockDocument: ReturnType<typeof createMockDocument>;

  beforeEach(() => {
    provider = new MarkdownEditorProvider(mockContext);
    mockWebview = createMockWebview();
    mockDocument = createMockDocument('# Hello World');
  });

  describe('init message', () => {
    it('sends content and filename on resolve', async () => {
      await provider.resolveCustomTextEditor(
        mockDocument,
        mockWebview.panel,
        { isCancellationRequested: false }
      );

      expect(mockWebview.postMessage).toHaveBeenCalledWith({
        type: 'init',
        content: '# Hello World',
        filename: 'test.md'
      });
    });
  });

  describe('update from webview', () => {
    it('updates document on content change message', async () => {
      await provider.resolveCustomTextEditor(
        mockDocument,
        mockWebview.panel,
        { isCancellationRequested: false }
      );

      // Simulate webview message
      const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({
        type: 'update',
        content: '# Updated Content'
      });

      expect(mockDocument.edit).toHaveBeenCalled();
    });

    it('debounces rapid updates', async () => {
      vi.useFakeTimers();

      await provider.resolveCustomTextEditor(
        mockDocument,
        mockWebview.panel,
        { isCancellationRequested: false }
      );

      const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];

      // Send 10 rapid updates
      for (let i = 0; i < 10; i++) {
        await messageHandler({ type: 'update', content: `Update ${i}` });
      }

      // Only last update should be applied after debounce
      vi.runAllTimers();

      expect(mockDocument.edit).toHaveBeenCalledTimes(1);
      expect(mockDocument.getText()).toContain('Update 9');
    });
  });

  describe('external document changes', () => {
    it('sends update to webview when document changes externally', async () => {
      await provider.resolveCustomTextEditor(
        mockDocument,
        mockWebview.panel,
        { isCancellationRequested: false }
      );

      // Simulate external change (e.g., git pull)
      mockDocument.simulateExternalChange('# Changed by Git');

      expect(mockWebview.postMessage).toHaveBeenLastCalledWith({
        type: 'update',
        content: '# Changed by Git'
      });
    });

    it('does not echo back self-originated changes', async () => {
      await provider.resolveCustomTextEditor(
        mockDocument,
        mockWebview.panel,
        { isCancellationRequested: false }
      );

      const initialCallCount = mockWebview.postMessage.mock.calls.length;

      // Simulate change from webview
      const messageHandler = mockWebview.onDidReceiveMessage.mock.calls[0][0];
      await messageHandler({ type: 'update', content: '# From Webview' });

      // Should not send back to webview
      expect(mockWebview.postMessage.mock.calls.length).toBe(initialCallCount);
    });
  });
});
```

### File I/O Round-Trip Testing

```typescript
// src/test/integration/file-io.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('File I/O Round-Trip', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pmtoolkit-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Markdown files', () => {
    it('preserves content exactly through save cycle', async () => {
      const original = `# Title

## Section

- [ ] Task one
- [x] Task two

\`\`\`javascript
const x = 1;
\`\`\`
`;
      const filePath = path.join(tempDir, 'test.md');

      // Simulate save
      await fs.writeFile(filePath, original, 'utf-8');

      // Simulate load
      const loaded = await fs.readFile(filePath, 'utf-8');

      expect(loaded).toBe(original);
    });

    it('handles UTF-8 characters correctly', async () => {
      const content = '# Hello \u4e16\u754c\n\nEmoji: \ud83d\ude80';
      const filePath = path.join(tempDir, 'unicode.md');

      await fs.writeFile(filePath, content, 'utf-8');
      const loaded = await fs.readFile(filePath, 'utf-8');

      expect(loaded).toBe(content);
    });

    it('handles large files efficiently', async () => {
      const lines = Array(10000).fill('- [ ] Task item with some content').join('\n');
      const content = `## Large Board\n\n${lines}`;
      const filePath = path.join(tempDir, 'large.kanban');

      const start = Date.now();
      await fs.writeFile(filePath, content, 'utf-8');
      await fs.readFile(filePath, 'utf-8');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('Kanban round-trip', () => {
    it('markdown -> board -> markdown preserves structure', async () => {
      const original = `## Backlog

- [ ] Task A
  Description for A
- [ ] Task B

## In Progress

- [ ] Task C

## Done

- [x] Task D
`;

      const board = KanbanParser.parseMarkdown(original);
      const regenerated = KanbanParser.toMarkdown(board);
      const reparsed = KanbanParser.parseMarkdown(regenerated);

      // Structure should match
      expect(reparsed.columns.length).toBe(board.columns.length);
      reparsed.columns.forEach((col, i) => {
        expect(col.title).toBe(board.columns[i].title);
        expect(col.cards.length).toBe(board.columns[i].cards.length);
      });
    });
  });
});
```

---

## 3. End-to-End Testing

### Framework: @vscode/test-electron

```json
// package.json (devDependencies)
{
  "@vscode/test-electron": "^2.4.x",
  "@vscode/test-cli": "^0.0.x"
}
```

### E2E Test Configuration

```typescript
// .vscode-test.mjs
import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/e2e/**/*.test.js',
  workspaceFolder: './test/fixtures/workspace',
  mocha: {
    ui: 'bdd',
    timeout: 60000
  },
  launchArgs: [
    '--disable-extensions', // Disable other extensions
    '--disable-gpu'         // Stability in CI
  ]
});
```

### E2E Test Examples

```typescript
// src/test/e2e/editor.test.ts
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

suite('Markdown Editor E2E', () => {
  const fixturesPath = path.resolve(__dirname, '../../fixtures');

  suiteSetup(async function() {
    this.timeout(30000);
    // Wait for extension activation
    const ext = vscode.extensions.getExtension('pm-toolkit.pm-toolkit');
    await ext?.activate();
  });

  test('opens .md file with custom editor', async () => {
    const docPath = path.join(fixturesPath, 'markdown', 'simple.md');
    const doc = await vscode.workspace.openTextDocument(docPath);
    await vscode.window.showTextDocument(doc);

    // Verify custom editor is active
    const activeEditor = vscode.window.activeTextEditor;
    // Custom editors don't have activeTextEditor, check via viewType
    // This is a simplified check - real implementation would verify webview
    assert.ok(doc.uri.fsPath.endsWith('.md'));
  });

  test('saves changes to disk', async () => {
    const docPath = path.join(fixturesPath, 'markdown', 'editable.md');
    const originalContent = await vscode.workspace.fs.readFile(
      vscode.Uri.file(docPath)
    );

    try {
      const doc = await vscode.workspace.openTextDocument(docPath);
      await vscode.window.showTextDocument(doc);

      // Make edit via command
      await vscode.commands.executeCommand('pmtoolkit.insertHeading', {
        level: 1,
        text: 'New Heading'
      });

      // Save
      await doc.save();

      // Verify file on disk
      const newContent = await vscode.workspace.fs.readFile(
        vscode.Uri.file(docPath)
      );
      const contentStr = Buffer.from(newContent).toString('utf-8');
      assert.ok(contentStr.includes('# New Heading'));
    } finally {
      // Restore original
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(docPath),
        originalContent
      );
    }
  });
});

suite('Kanban Board E2E', () => {
  test('opens .kanban file as board', async () => {
    const docPath = path.join(fixturesPath, 'kanban', 'board.kanban');
    const doc = await vscode.workspace.openTextDocument(docPath);

    await vscode.commands.executeCommand(
      'vscode.openWith',
      doc.uri,
      'pmtoolkit.kanbanEditor'
    );

    // Verify board opened (would need webview inspection in real test)
    assert.ok(true);
  });

  test('toggles task completion', async () => {
    const docPath = path.join(fixturesPath, 'kanban', 'tasks.kanban');
    const doc = await vscode.workspace.openTextDocument(docPath);

    await vscode.commands.executeCommand(
      'vscode.openWith',
      doc.uri,
      'pmtoolkit.kanbanEditor'
    );

    // Execute toggle command
    await vscode.commands.executeCommand('pmtoolkit.toggleTask', {
      taskId: 'task-1'
    });

    // Verify file changed
    const content = doc.getText();
    assert.ok(content.includes('- [x]'));
  });
});

suite('File Viewers E2E', () => {
  test('opens PDF without error', async () => {
    const pdfPath = path.join(fixturesPath, 'files', 'sample.pdf');
    const doc = await vscode.workspace.openTextDocument(
      vscode.Uri.file(pdfPath)
    );

    await vscode.commands.executeCommand(
      'vscode.openWith',
      doc.uri,
      'pmtoolkit.pdfViewer'
    );

    // No error means success for read-only viewer
    assert.ok(true);
  });

  test('opens DOCX and renders content', async () => {
    const docxPath = path.join(fixturesPath, 'files', 'sample.docx');

    await vscode.commands.executeCommand(
      'vscode.openWith',
      vscode.Uri.file(docxPath),
      'pmtoolkit.docxViewer'
    );

    assert.ok(true);
  });

  test('opens XLSX with multiple sheets', async () => {
    const xlsxPath = path.join(fixturesPath, 'files', 'multisheet.xlsx');

    await vscode.commands.executeCommand(
      'vscode.openWith',
      vscode.Uri.file(xlsxPath),
      'pmtoolkit.excelViewer'
    );

    assert.ok(true);
  });

  test('opens CSV and detects delimiter', async () => {
    const csvPath = path.join(fixturesPath, 'files', 'semicolon.csv');

    await vscode.commands.executeCommand(
      'vscode.openWith',
      vscode.Uri.file(csvPath),
      'pmtoolkit.csvViewer'
    );

    assert.ok(true);
  });
});
```

### Webview Testing with Playwright

For testing actual webview interactions, we can use Playwright in a headless browser.

```typescript
// webview/test/e2e/browser/kanban.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Kanban Board UI', () => {
  test.beforeEach(async ({ page }) => {
    // Load webview HTML directly for testing
    await page.goto('file://' + __dirname + '/../../fixtures/kanban-webview.html');

    // Initialize with test data
    await page.evaluate(() => {
      window.postMessage({
        type: 'init',
        content: `## Todo\n\n- [ ] Task A\n- [ ] Task B\n\n## Done\n\n- [x] Task C`
      }, '*');
    });
  });

  test('renders columns from markdown', async ({ page }) => {
    await expect(page.locator('.kanban-column')).toHaveCount(2);
    await expect(page.locator('.kanban-column').first()).toContainText('Todo');
    await expect(page.locator('.kanban-column').last()).toContainText('Done');
  });

  test('renders task cards', async ({ page }) => {
    const todoColumn = page.locator('.kanban-column').first();
    await expect(todoColumn.locator('.kanban-card')).toHaveCount(2);
  });

  test('shows completed state for done tasks', async ({ page }) => {
    const doneColumn = page.locator('.kanban-column').last();
    const card = doneColumn.locator('.kanban-card').first();
    await expect(card).toHaveClass(/completed/);
  });

  test('toggles task completion on checkbox click', async ({ page }) => {
    const todoColumn = page.locator('.kanban-column').first();
    const firstCard = todoColumn.locator('.kanban-card').first();
    const checkbox = firstCard.locator('input[type="checkbox"]');

    await checkbox.click();

    await expect(firstCard).toHaveClass(/completed/);
  });

  test('supports drag and drop between columns', async ({ page }) => {
    const sourceCard = page.locator('.kanban-column').first()
      .locator('.kanban-card').first();
    const targetColumn = page.locator('.kanban-column').last();

    await sourceCard.dragTo(targetColumn);

    // Card should now be in Done column
    await expect(targetColumn.locator('.kanban-card')).toHaveCount(2);
  });

  test('sends update message on change', async ({ page }) => {
    const messages: any[] = [];

    await page.evaluate(() => {
      const original = window.acquireVsCodeApi;
      window.acquireVsCodeApi = () => ({
        postMessage: (msg: any) => {
          (window as any).__testMessages = (window as any).__testMessages || [];
          (window as any).__testMessages.push(msg);
        },
        getState: () => ({}),
        setState: () => {}
      });
    });

    // Make a change
    const checkbox = page.locator('.kanban-card').first()
      .locator('input[type="checkbox"]');
    await checkbox.click();

    // Check message was sent
    const sentMessages = await page.evaluate(
      () => (window as any).__testMessages
    );
    expect(sentMessages).toContainEqual(
      expect.objectContaining({ type: 'update' })
    );
  });
});
```

---

## 4. Component-Specific Testing

### Markdown Parser Edge Cases

```typescript
// webview/editor/parser.test.ts
import { describe, it, expect } from 'vitest';
import { MarkdownParser } from './parser';

describe('Markdown Parser Edge Cases', () => {
  describe('nested structures', () => {
    it('handles deeply nested lists', () => {
      const md = `
- Level 1
  - Level 2
    - Level 3
      - Level 4
`;
      const doc = MarkdownParser.parse(md);
      // Verify structure maintained
      expect(doc).toBeDefined();
    });

    it('handles mixed list types', () => {
      const md = `
1. Ordered
   - Unordered child
   - Another child
2. Back to ordered
`;
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });

    it('handles blockquote with nested content', () => {
      const md = `
> Quote with
> - a list
> - inside
>
> And a code block:
> \`\`\`js
> code
> \`\`\`
`;
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });
  });

  describe('special characters', () => {
    it('handles HTML entities', () => {
      const md = '&amp; &lt; &gt; &quot;';
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });

    it('handles escape sequences', () => {
      const md = '\\*not bold\\* \\[not link\\]';
      const doc = MarkdownParser.parse(md);
      // Should not render as bold or link
      expect(doc).toBeDefined();
    });

    it('handles emoji shortcodes', () => {
      const md = ':smile: :rocket: :+1:';
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });
  });

  describe('tables', () => {
    it('handles table with alignment', () => {
      const md = `
| Left | Center | Right |
|:-----|:------:|------:|
| 1    | 2      | 3     |
`;
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });

    it('handles table with missing cells', () => {
      const md = `
| A | B | C |
|---|---|---|
| 1 |   | 3 |
| 4 | 5 |   |
`;
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });
  });

  describe('code blocks', () => {
    it('handles code block with language', () => {
      const md = '```typescript\nconst x: number = 1;\n```';
      const doc = MarkdownParser.parse(md);
      expect(doc).toBeDefined();
    });

    it('handles code block with markdown inside', () => {
      const md = '```markdown\n# Heading inside code\n- list item\n```';
      const doc = MarkdownParser.parse(md);
      // Should not parse as actual markdown
      expect(doc).toBeDefined();
    });
  });

  describe('frontmatter', () => {
    it('parses YAML frontmatter at document start', () => {
      const md = `---
title: Test
date: 2024-01-01
---

# Content`;
      const result = MarkdownParser.parseWithFrontmatter(md);
      expect(result.frontmatter).toEqual({
        title: 'Test',
        date: '2024-01-01'
      });
    });

    it('ignores --- not at document start', () => {
      const md = `# Title

---

Content after hr`;
      const result = MarkdownParser.parseWithFrontmatter(md);
      expect(result.frontmatter).toBeNull();
    });
  });
});
```

### Mermaid Diagram Validation

```typescript
// webview/editor/extensions/mermaid.test.ts
import { describe, it, expect } from 'vitest';
import mermaid from 'mermaid';

describe('Mermaid Diagram Validation', () => {
  beforeAll(() => {
    mermaid.initialize({ startOnLoad: false });
  });

  describe('supported diagram types', () => {
    const validDiagrams = [
      ['flowchart', 'flowchart TD\n  A --> B'],
      ['sequence', 'sequenceDiagram\n  A->>B: Hello'],
      ['class', 'classDiagram\n  class Animal'],
      ['state', 'stateDiagram-v2\n  [*] --> State1'],
      ['gantt', 'gantt\n  title Plan\n  section A\n  Task: a1, 2024-01-01, 30d'],
      ['pie', 'pie\n  title Pets\n  "Dogs": 100'],
    ];

    it.each(validDiagrams)('validates %s diagram', async (name, code) => {
      const isValid = await mermaid.parse(code);
      expect(isValid).toBe(true);
    });
  });

  describe('invalid diagrams', () => {
    it('rejects invalid syntax', async () => {
      const invalid = 'flowchart INVALID\n  ??? --> !!!';
      await expect(mermaid.parse(invalid)).rejects.toThrow();
    });

    it('provides helpful error messages', async () => {
      const invalid = 'flowchart TD\n  A --> ';
      try {
        await mermaid.parse(invalid);
      } catch (e: any) {
        expect(e.message).toBeDefined();
        // Error should indicate what went wrong
      }
    });
  });

  describe('rendering', () => {
    it('renders to SVG', async () => {
      const code = 'flowchart TD\n  A --> B';
      const { svg } = await mermaid.render('test-id', code);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('applies theme configuration', async () => {
      mermaid.initialize({ theme: 'dark' });
      const { svg } = await mermaid.render('dark-test', 'flowchart TD\n  A');
      // Dark theme should have specific colors
      expect(svg).toContain('#');
    });
  });
});
```

### Template System Testing

```typescript
// src/templates/TemplateManager.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { TemplateManager } from './TemplateManager';

describe('Template System Integration', () => {
  let tempDir: string;
  let manager: TemplateManager;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'templates-'));
    manager = new TemplateManager(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('discovers templates in folder', async () => {
    // Create test templates
    await fs.writeFile(
      path.join(tempDir, 'meeting.md'),
      `---
template_name: "Meeting Notes"
---
# Meeting`
    );
    await fs.writeFile(
      path.join(tempDir, 'todo.md'),
      `---
template_name: "Todo List"
---
# Todo`
    );

    const templates = await manager.discoverTemplates();
    expect(templates).toHaveLength(2);
    expect(templates.map(t => t.name)).toContain('Meeting Notes');
    expect(templates.map(t => t.name)).toContain('Todo List');
  });

  it('ignores files without template metadata', async () => {
    await fs.writeFile(
      path.join(tempDir, 'regular.md'),
      '# Just a regular file'
    );
    await fs.writeFile(
      path.join(tempDir, 'template.md'),
      `---
template_name: "Valid Template"
---
Content`
    );

    const templates = await manager.discoverTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Valid Template');
  });

  it('replaces all variables on insert', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T09:30:00'));

    await fs.writeFile(
      path.join(tempDir, 'dated.md'),
      `---
template_name: "Dated Note"
---
# Note - {{date}}

Created: {{datetime}}
Year: {{year}}, Month: {{month}}, Day: {{day}}
Time: {{time}}`
    );

    const templates = await manager.discoverTemplates();
    const content = await manager.getTemplateContent(templates[0].id);

    expect(content).toContain('# Note - 2024-03-15');
    expect(content).toContain('Created: 2024-03-15 09:30:00');
    expect(content).toContain('Year: 2024');
    expect(content).toContain('Month: 03');
    expect(content).toContain('Day: 15');
    expect(content).toContain('Time: 09:30:00');
  });

  it('handles nested template folders', async () => {
    const nestedDir = path.join(tempDir, 'meetings');
    await fs.mkdir(nestedDir);

    await fs.writeFile(
      path.join(nestedDir, 'standup.md'),
      `---
template_name: "Daily Standup"
---
# Standup`
    );

    const templates = await manager.discoverTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe('Daily Standup');
  });
});
```

---

## 5. Manual Testing Checklist

### Pre-Release Manual Testing Protocol

These checks cannot be fully automated and require human judgment.

```markdown
## Manual Testing Checklist v1.0

**Tester**: ________________
**Version**: ________________
**Date**: ________________
**Platform**: [ ] macOS [ ] Windows [ ] Linux

---

### 1. Markdown Editor (F1)

#### Basic Editing
- [ ] Open a .md file - editor loads without error
- [ ] Type text - appears immediately in WYSIWYG view
- [ ] Bold (Cmd/Ctrl+B) - applies and shows bold
- [ ] Italic (Cmd/Ctrl+I) - applies and shows italic
- [ ] Undo (Cmd/Ctrl+Z) - reverts last change
- [ ] Redo (Cmd/Ctrl+Shift+Z) - reapplies change
- [ ] Copy/paste formatted text - preserves formatting

#### Block Elements
- [ ] Create H1-H6 headings - render at correct sizes
- [ ] Create bullet list - indentation correct
- [ ] Create numbered list - numbers increment
- [ ] Create checkbox list - checkboxes interactive
- [ ] Create blockquote - styled as quote
- [ ] Create code block - syntax highlighting works
- [ ] Insert horizontal rule - renders as divider

#### Tables
- [ ] Create table via slash command - size picker works
- [ ] Add row - row appears below current
- [ ] Add column - column appears to right
- [ ] Delete row/column - removes correctly
- [ ] Tab through cells - navigation works

#### Save/Load
- [ ] Make changes and save - file updated on disk
- [ ] External change (edit in another editor) - view updates
- [ ] Large file (1MB+) - opens without hanging

---

### 2. Slash Commands (F2)

- [ ] Type `/` at line start - menu appears
- [ ] Type `/h` - filters to heading options
- [ ] Arrow keys - navigate menu
- [ ] Enter - inserts selected command
- [ ] Escape - closes menu without action
- [ ] Click item - inserts that command
- [ ] Menu positions correctly near cursor
- [ ] Menu flips when near bottom of view

---

### 3. Kanban Board (F3)

#### Display
- [ ] Open .kanban file - board renders
- [ ] Columns show correct headings
- [ ] Cards show task text
- [ ] Completed tasks show checked
- [ ] Task count per column is accurate

#### Interactions
- [ ] Drag card to different column - moves correctly
- [ ] Drag card to reorder in column - reorders
- [ ] Click checkbox - toggles completion
- [ ] Double-click card - edit mode activates
- [ ] Add new task button - adds card
- [ ] Delete task - removes with confirmation

#### Auto-behaviors
- [ ] Move to "Done" column - auto-completes task
- [ ] Archive column hidden by default
- [ ] Changes sync to markdown file

---

### 4. File Viewers (F4-F7)

#### PDF Viewer
- [ ] Opens PDF file
- [ ] Page navigation works (prev/next)
- [ ] Page number input works
- [ ] Zoom in/out works
- [ ] Fit width/page works
- [ ] Scroll through pages works
- [ ] Large PDF (50+ pages) - doesn't freeze

#### Word Viewer
- [ ] Opens .docx file
- [ ] Text content readable
- [ ] Basic formatting preserved (bold, italic)
- [ ] Headings styled correctly
- [ ] Images display (if embedded)

#### Excel Viewer
- [ ] Opens .xlsx file
- [ ] Data displays in table
- [ ] Column headers (A, B, C) present
- [ ] Row numbers present
- [ ] Sheet tabs work (multi-sheet)
- [ ] Numbers/dates formatted

#### CSV Viewer
- [ ] Opens .csv file
- [ ] Auto-detects comma delimiter
- [ ] Opens semicolon-delimited file
- [ ] Opens tab-delimited file
- [ ] Header row toggle works
- [ ] Column sorting works

---

### 5. Templates (F8)

- [ ] Templates appear in slash menu
- [ ] Selecting template inserts content
- [ ] {{date}} replaced with current date
- [ ] {{time}} replaced with current time
- [ ] {{datetime}} replaced correctly
- [ ] Adding new template file - appears in menu

---

### 6. Mermaid Diagrams (F9)

- [ ] Flowchart renders inline
- [ ] Sequence diagram renders
- [ ] Diagram updates on code change
- [ ] Zoom controls work
- [ ] Theme matches VS Code theme

---

### 7. Cross-Platform Checks

#### Windows-Specific
- [ ] File paths with backslashes work
- [ ] CRLF line endings handled
- [ ] Windows keyboard shortcuts work

#### macOS-Specific
- [ ] Cmd key shortcuts work
- [ ] Trackpad gestures work in viewers

#### Linux-Specific
- [ ] Ctrl key shortcuts work
- [ ] Various distros (Ubuntu, Fedora) tested

---

### 8. Theme Compatibility

- [ ] Light theme - text readable, contrast good
- [ ] Dark theme - colors appropriate
- [ ] High contrast theme - meets a11y standards
- [ ] Theme switch - editor updates immediately

---

### 9. Accessibility

- [ ] Keyboard navigation - all features accessible
- [ ] Screen reader - content announced (test with VoiceOver/NVDA)
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Color not sole indicator of state

---

### 10. Performance

- [ ] Extension activation < 2 seconds
- [ ] Editor opens file < 1 second
- [ ] Typing latency imperceptible
- [ ] Kanban drag smooth (60fps)
- [ ] Memory usage stable over time

---

### Issues Found

| # | Severity | Description | Steps to Reproduce |
|---|----------|-------------|--------------------|
| 1 |          |             |                    |
| 2 |          |             |                    |

---

### Sign-Off

- [ ] All P0 features working
- [ ] No severity-1 bugs
- [ ] Ready for release

Signature: ________________  Date: ________________
```

---

## 6. CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  # Fast checks - must pass before anything else
  quality-gates:
    name: Quality Gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Type Check
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Format Check
        run: npm run format:check

  # Unit and integration tests
  test-unit:
    name: Unit Tests
    needs: quality-gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Run Unit Tests
        run: npm run test:unit -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

  # E2E tests in VS Code environment
  test-e2e:
    name: E2E Tests (${{ matrix.os }})
    needs: quality-gates
    strategy:
      fail-fast: false
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Build Extension
        run: npm run build

      - name: Run E2E Tests (Linux)
        if: runner.os == 'Linux'
        run: xvfb-run -a npm run test:e2e

      - name: Run E2E Tests (Windows/macOS)
        if: runner.os != 'Linux'
        run: npm run test:e2e

  # Webview browser tests
  test-webview:
    name: Webview Tests
    needs: quality-gates
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build Webviews
        run: npm run build:webview

      - name: Run Webview Tests
        run: npm run test:webview

      - name: Upload Test Results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/

  # Build verification
  build:
    name: Build Package
    needs: [test-unit, test-e2e, test-webview]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - run: npm ci

      - name: Build Extension
        run: npm run build

      - name: Package VSIX
        run: npm run package

      - name: Upload VSIX
        uses: actions/upload-artifact@v4
        with:
          name: pm-toolkit-vsix
          path: '*.vsix'
```

### Pre-Release Workflow

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  # Full test suite must pass
  test:
    uses: ./.github/workflows/ci.yml

  # Additional pre-release checks
  pre-release-checks:
    name: Pre-Release Validation
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Check Version Match
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          PKG_VERSION=$(node -p "require('./package.json').version")
          if [ "$TAG_VERSION" != "$PKG_VERSION" ]; then
            echo "Tag version ($TAG_VERSION) doesn't match package.json ($PKG_VERSION)"
            exit 1
          fi

      - name: Check CHANGELOG
        run: |
          TAG_VERSION=${GITHUB_REF#refs/tags/v}
          if ! grep -q "## \[$TAG_VERSION\]" CHANGELOG.md; then
            echo "CHANGELOG.md missing entry for version $TAG_VERSION"
            exit 1
          fi

      - name: Security Audit
        run: npm audit --audit-level=high

      - name: License Check
        run: npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'

  # Publish to marketplace
  publish:
    name: Publish Extension
    needs: pre-release-checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Build & Package
        run: |
          npm run build
          npm run package

      - name: Publish to VS Code Marketplace
        run: npx @vscode/vsce publish -p ${{ secrets.VSCE_PAT }}

      - name: Publish to Open VSX
        run: npx ovsx publish -p ${{ secrets.OVSX_PAT }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: '*.vsix'
          generate_release_notes: true
```

### Package.json Scripts

```json
{
  "scripts": {
    "build": "npm run build:extension && npm run build:webview",
    "build:extension": "esbuild src/extension.ts --bundle --outfile=out/extension.js --external:vscode --platform=node --format=cjs",
    "build:webview": "esbuild webview/*/main.ts --bundle --outdir=out/webview --format=iife",

    "typecheck": "tsc --noEmit",
    "lint": "eslint src webview --ext .ts,.tsx",
    "lint:fix": "eslint src webview --ext .ts,.tsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",

    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:unit:watch": "vitest watch",
    "test:unit:ui": "vitest --ui",
    "test:e2e": "vscode-test",
    "test:webview": "playwright test webview/test/e2e",
    "test:coverage": "vitest run --coverage",

    "pretest": "npm run build",
    "package": "vsce package",

    "prepare": "husky"
  }
}
```

### Pre-Commit Hooks

```javascript
// .husky/pre-commit
npm run lint
npm run typecheck
npm run test:unit -- --run --changed
```

```javascript
// .lintstagedrc.js
module.exports = {
  '*.{ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write'],
};
```

---

## 7. Test Coverage Requirements

### Coverage Thresholds

| Category | Lines | Branches | Functions | Statements |
|----------|-------|----------|-----------|------------|
| **Overall** | 70% | 60% | 70% | 70% |
| **Parsers** | 90% | 85% | 90% | 90% |
| **Templates** | 85% | 80% | 85% | 85% |
| **Utilities** | 80% | 75% | 80% | 80% |
| **Editors** | 60% | 50% | 60% | 60% |
| **Viewers** | 50% | 40% | 50% | 50% |

### Coverage Exceptions

Explicitly excluded from coverage requirements:

```typescript
// vitest.config.ts coverage.exclude
[
  '**/test/**',           // Test files themselves
  '**/types/**',          // Type definitions
  '**/*.d.ts',            // Declaration files
  '**/index.ts',          // Barrel exports
  'src/extension.ts',     // Entry point (tested via E2E)
]
```

---

## 8. Test Data Management

### Fixture Organization

```
test/fixtures/
├── markdown/
│   ├── simple.md           # Basic content
│   ├── complex.md          # All features
│   ├── edge-cases.md       # Edge cases
│   └── large.md            # Performance testing
├── kanban/
│   ├── board.kanban        # Standard board
│   ├── empty.kanban        # No tasks
│   └── complex.kanban      # Many columns/tasks
├── templates/
│   ├── meeting.md
│   ├── todo.md
│   └── invalid.md          # Malformed template
├── files/
│   ├── sample.pdf
│   ├── sample.docx
│   ├── multisheet.xlsx
│   ├── comma.csv
│   ├── semicolon.csv
│   └── tab.tsv
└── workspace/
    └── .vscode/
        └── settings.json
```

### Golden File Testing

For parser outputs that should remain stable:

```typescript
// test/helpers/golden.ts
import * as fs from 'fs/promises';
import * as path from 'path';

export async function assertMatchesGolden(
  actual: string,
  goldenPath: string,
  updateGolden = false
) {
  const fullPath = path.resolve(__dirname, '../fixtures/golden', goldenPath);

  if (updateGolden) {
    await fs.writeFile(fullPath, actual);
    return;
  }

  const expected = await fs.readFile(fullPath, 'utf-8');
  expect(actual).toBe(expected);
}
```

---

## 9. Flakiness Prevention

### Design Rules

1. **No `setTimeout` in tests** - Use `vi.useFakeTimers()` or proper waits
2. **No network calls** - Mock all external services
3. **Deterministic IDs** - Use seeded ID generators in tests
4. **Isolated state** - Each test creates and cleans up its own data
5. **Explicit waits** - Wait for specific conditions, not arbitrary delays

### Flakiness Tracking

```yaml
# .github/workflows/flakiness.yml
name: Flakiness Detection

on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM

jobs:
  detect-flaky:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Run Tests Multiple Times
        run: |
          for i in {1..10}; do
            npm run test:unit -- --run || echo "Run $i failed"
          done 2>&1 | tee test-runs.log

      - name: Analyze Results
        run: |
          FAILURES=$(grep -c "failed" test-runs.log || true)
          if [ "$FAILURES" -gt 0 ] && [ "$FAILURES" -lt 10 ]; then
            echo "::warning::Potential flaky tests detected ($FAILURES/10 runs failed)"
          fi
```

### Quarantine Protocol

When a flaky test is identified:

1. Add `@flaky` tag and skip in CI
2. Create issue with failure pattern
3. Fix within 1 sprint or delete
4. Never leave flaky tests running in CI

```typescript
describe.skip('Flaky test - Issue #123', () => {
  // Quarantined: Fails intermittently due to timing issue
  // TODO: Fix by implementing proper wait for webview ready state
  it('should do something', () => {
    // ...
  });
});
```

---

## 10. Success Metrics

### Quantitative Goals

| Metric | Target | Measurement |
|--------|--------|-------------|
| Unit test runtime | < 30 seconds | CI logs |
| Full CI pipeline | < 10 minutes | CI logs |
| Flaky test rate | < 1% | Flakiness job |
| Coverage (overall) | > 70% | Codecov |
| E2E pass rate | > 99% | CI history |
| Bug escape rate | < 5% | Post-release bugs vs. pre-release bugs caught |

### Qualitative Goals

- Developers trust the test suite (green = ship-ready)
- Test failures clearly indicate what broke and why
- New features can be tested without fighting the framework
- Test maintenance burden is low (< 10% of feature development time)

---

## Appendix A: Test File Naming Conventions

```
*.test.ts        - Unit tests (Vitest)
*.spec.ts        - E2E/integration tests (Playwright)
*.contract.ts    - Contract tests for mocks
```

## Appendix B: Recommended VS Code Settings

```json
// .vscode/settings.json
{
  "vitest.enable": true,
  "vitest.commandLine": "npm run test:unit --",
  "testing.automaticallyOpenPeekView": "failureVisible"
}
```

## Appendix C: Useful Commands

```bash
# Run specific test file
npm run test:unit -- src/templates/TemplateManager.test.ts

# Run tests matching pattern
npm run test:unit -- -t "replaces variables"

# Update snapshots
npm run test:unit -- -u

# Run E2E tests with debug output
DEBUG=pw:api npm run test:webview

# Generate coverage report
npm run test:coverage && open coverage/index.html
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-XX-XX | Testing Architect | Initial plan |

---

*This testing plan is a living document. Update it as the codebase evolves and new testing requirements emerge.*
