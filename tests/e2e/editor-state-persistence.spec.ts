/**
 * Editor State Persistence Tests
 *
 * Tests that the editor survives extension reloads and preserves user content.
 * This is critical for development scenarios (F5 reload) and extension updates.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('State Persistence', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('saves content to vscode state on edits', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type some content
    await editor.type('Important document content');
    await editor.waitForSync();

    // Check that state was saved
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state).toBeDefined();
    expect(state.content).toBeDefined();
    expect(state.content).toContain('Important document content');
  });

  test('state is updated on subsequent edits', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // First edit
    await editor.type('First version');
    await editor.waitForSync();

    const state1 = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state1.content).toContain('First version');

    // Second edit
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('Second line added');
    await editor.waitForSync();

    const state2 = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state2.content).toContain('First version');
    expect(state2.content).toContain('Second line added');
  });

  test('editor initializes and sends ready message after reload', async ({ page }) => {
    // Load the editor
    await editor.load();

    // Type some content
    await editor.type('Content before reload');
    await editor.waitForSync();

    // Verify state was saved
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('Content before reload');

    // Reload the page
    await page.reload();
    await editor.proseMirror.waitFor({ state: 'visible' });

    // Wait for ready message - editor should initialize properly
    await page.waitForFunction(() => {
      return window._vscodeMessages?.some((m: any) => m.type === 'ready');
    }, { timeout: 5000 });

    // Editor should be visible and functional
    await expect(editor.proseMirror).toBeVisible();

    // Can type in the reloaded editor
    await editor.focus();
    await editor.type('After reload');
    await editor.waitForSync();

    const text = await editor.getVisibleText();
    expect(text).toContain('After reload');
  });

  test('state persists formatted content correctly', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type formatted content
    await editor.type('# Heading');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('**bold** and *italic*');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('- list item');
    await editor.waitForSync();

    // Check state contains markdown formatting
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('# Heading');
    expect(state.content).toContain('**bold**');
    expect(state.content).toContain('*italic*');
    expect(state.content).toContain('- list item');
  });

  test('state persists table content', async ({ page }) => {
    // Load with a table
    const tableMarkdown = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |`;

    await editor.load(tableMarkdown);

    // Click in table and add content
    await editor.clickTableCell(2, 1);
    await editor.waitForSync();

    // Edit cell content
    await page.keyboard.type(' modified');
    await editor.waitForSync();

    // Check state
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('Header 1');
    expect(state.content).toContain('Cell 1');
  });

  test('state persists task list states', async ({ page }) => {
    // Load with a task list (typing doesn't auto-convert to task list)
    const content = `- [ ] First task
- [ ] Second task`;
    await editor.load(content);

    // Verify task list rendered
    const hasTaskList = await editor.hasElement('ul[data-type="taskList"]');
    expect(hasTaskList).toBe(true);

    // Check the first task
    await editor.checkTaskItem(0);
    await editor.waitForSync();

    // Verify state has task list with checked item
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toBeDefined();
    // Task list should be in the content with checked state
    expect(state.content).toContain('[x]'); // Checked
    expect(state.content).toContain('[ ]'); // Unchecked
  });

  test('content survives simulated reload with state restoration', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create substantial content
    await editor.type('# My Document');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('This is important content that must not be lost.');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('- Item one');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('Item two');
    await editor.waitForSync();

    // Get the saved state
    const savedState = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(savedState.content).toContain('My Document');

    // Now reload the page
    await page.reload();
    await editor.proseMirror.waitFor({ state: 'visible' });

    // Pre-set the state before the editor fully initializes
    // (In real VS Code, getState() returns the previous state)
    await page.evaluate((content) => {
      window.vscode.setState({ content });
    }, savedState.content);

    // Simulate the init message with the same content
    await editor.simulateInit(savedState.content!);

    // Verify content is restored
    expect(await editor.hasElement('h1')).toBe(true);
    expect(await editor.getElementText('h1')).toBe('My Document');

    const text = await editor.getVisibleText();
    expect(text).toContain('important content that must not be lost');
    expect(text).toContain('Item one');
  });

  test('handles empty state gracefully', async ({ page }) => {
    await page.goto('/');
    await editor.proseMirror.waitFor({ state: 'visible' });

    // Ensure state is empty/undefined
    await page.evaluate(() => {
      window.vscode.setState({});
    });

    // Wait for ready
    await page.waitForFunction(() => {
      return window._vscodeMessages?.some((m: any) => m.type === 'ready');
    }, { timeout: 5000 });

    // Editor should still work with empty state
    await editor.simulateInit('Hello world');
    expect(await editor.getVisibleText()).toContain('Hello world');
  });

  test('init message takes precedence over stale state', async ({ page }) => {
    await page.goto('/');
    await editor.proseMirror.waitFor({ state: 'visible' });

    // Set stale state
    await page.evaluate(() => {
      window.vscode.setState({ content: 'Old stale content from before' });
    });

    // Wait for ready
    await page.waitForFunction(() => {
      return window._vscodeMessages?.some((m: any) => m.type === 'ready');
    }, { timeout: 5000 });

    // Send fresh init with different content
    await editor.simulateInit('Fresh content from extension');

    // Fresh content should be shown (init takes precedence)
    const text = await editor.getVisibleText();
    expect(text).toContain('Fresh content from extension');
  });

  test('undo/redo still works after content restoration', async ({ page }) => {
    await editor.load('Initial content');
    await editor.focus();

    // Make edits
    await editor.pressKey('End');
    await editor.typeWithoutClick(' plus edits');
    await editor.waitForSync();

    // Verify state saved
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('plus edits');

    // Undo
    await editor.undo();
    await editor.waitForSync();

    // Check undo worked
    let text = await editor.getVisibleText();
    expect(text).not.toContain('plus edits');

    // Redo
    await editor.redo();
    await editor.waitForSync();

    // Check redo worked
    text = await editor.getVisibleText();
    expect(text).toContain('plus edits');
  });

  test('rapid edits all get persisted to state', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type rapidly
    await page.keyboard.type('Quick typing test 123');

    // Wait for debounce
    await editor.waitForSync();

    // All content should be in state
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('Quick typing test 123');
  });

  test('state preserves cursor-position-relevant structure', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create content with multiple blocks
    await editor.type('Paragraph 1');
    await editor.pressKey('Enter');
    await editor.pressKey('Enter'); // Empty paragraph
    await editor.typeWithoutClick('Paragraph 2');
    await editor.pressKey('Enter');
    await editor.typeWithoutClick('Paragraph 3');
    await editor.waitForSync();

    // Verify structure is preserved in state
    const state = await page.evaluate(() => window.vscode.getState()) as { content?: string };
    expect(state.content).toContain('Paragraph 1');
    expect(state.content).toContain('Paragraph 2');
    expect(state.content).toContain('Paragraph 3');

    // Reload and restore
    await page.reload();
    await editor.proseMirror.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      return window._vscodeMessages?.some((m: any) => m.type === 'ready');
    }, { timeout: 5000 });

    await editor.simulateInit(state.content!);

    // Should have multiple paragraphs
    const paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBeGreaterThanOrEqual(3);
  });
});
