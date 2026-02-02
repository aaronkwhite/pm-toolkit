/**
 * Code Block Navigation Tests
 *
 * Tests for keyboard navigation to exit code blocks (v0.3.0 feature)
 */

import { test, expect, Page } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

let editor: EditorHelper;

test.beforeEach(async ({ page }) => {
  editor = new EditorHelper(page);
});

test.describe('Code Block Navigation', () => {
  const codeBlockContent = `Some text above

\`\`\`javascript
const x = 1;
\`\`\`

Some text below`;

  test('ArrowUp at start of code block exits above', async ({ page }) => {
    await editor.load(codeBlockContent);

    // Click at the start of the code block content
    const codeBlock = editor.proseMirror.locator('pre code');
    await codeBlock.click();

    // Move to the very start of the code block
    await page.keyboard.press('Meta+ArrowUp'); // Jump to start

    // Now press ArrowUp to exit
    await page.keyboard.press('ArrowUp');

    // Type something to verify we're above the code block
    await page.keyboard.type('INSERTED');
    await editor.waitForSync();

    const content = await editor.getLastUpdateContent();
    // The inserted text should be before the code block
    expect(content.indexOf('INSERTED')).toBeLessThan(content.indexOf('```javascript'));
  });

  test('ArrowDown at end of code block exits below', async ({ page }) => {
    await editor.load(codeBlockContent);

    // Click in the code block
    const codeBlock = editor.proseMirror.locator('pre code');
    await codeBlock.click();

    // Move to the very end of the code block
    await page.keyboard.press('Meta+ArrowDown'); // Jump to end

    // Now press ArrowDown to exit
    await page.keyboard.press('ArrowDown');

    // Type something to verify we're below the code block
    await page.keyboard.type('INSERTED');
    await editor.waitForSync();

    const content = await editor.getLastUpdateContent();
    // The inserted text should be after the code block
    expect(content.indexOf('INSERTED')).toBeGreaterThan(content.indexOf('```'));
  });

  test('Cmd+Enter in code block inserts paragraph below and exits', async ({ page }) => {
    const content = `\`\`\`javascript
const x = 1;
\`\`\``;
    await editor.load(content);

    // Click in the code block
    const codeBlock = editor.proseMirror.locator('pre code');
    await codeBlock.click();

    // Press Cmd+Enter to exit and insert below
    await page.keyboard.press('Meta+Enter');

    // Type something to verify we're below the code block
    await page.keyboard.type('New paragraph');
    await editor.waitForSync();

    const updatedContent = await editor.getLastUpdateContent();
    expect(updatedContent).toContain('```');
    expect(updatedContent).toContain('New paragraph');
    // New paragraph should be after the code block
    expect(updatedContent.indexOf('New paragraph')).toBeGreaterThan(updatedContent.indexOf('```'));
  });

  test('code block with no content below - ArrowDown creates new paragraph', async ({ page }) => {
    const content = `\`\`\`javascript
const x = 1;
\`\`\``;
    await editor.load(content);

    // Click in the code block
    const codeBlock = editor.proseMirror.locator('pre code');
    await codeBlock.click();

    // Move to end and press ArrowDown
    await page.keyboard.press('Meta+ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Type to verify we exited
    await page.keyboard.type('After code');
    await editor.waitForSync();

    const updatedContent = await editor.getLastUpdateContent();
    expect(updatedContent).toContain('After code');
  });

  test('code block with HR below - Cmd+Enter inserts paragraph between', async ({ page }) => {
    const content = `\`\`\`javascript
const x = 1;
\`\`\`

---`;
    await editor.load(content);

    // Click in the code block
    const codeBlock = editor.proseMirror.locator('pre code');
    await codeBlock.click();

    // Press Cmd+Enter
    await page.keyboard.press('Meta+Enter');

    // Type to verify we're between code block and HR
    await page.keyboard.type('Between');
    await editor.waitForSync();

    const updatedContent = await editor.getLastUpdateContent();
    // "Between" should be after code block but before HR
    const codeEnd = updatedContent.indexOf('```\n') + 4;
    const hrPos = updatedContent.indexOf('---');
    const betweenPos = updatedContent.indexOf('Between');

    expect(betweenPos).toBeGreaterThan(codeEnd);
    expect(betweenPos).toBeLessThan(hrPos);
  });
});

test.describe('Table Exit Navigation', () => {
  test('Cmd+Enter in table inserts paragraph below and exits', async ({ page }) => {
    const content = `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`;
    await editor.load(content);

    // Click in a table cell
    const cell = editor.proseMirror.locator('td').first();
    await cell.click();

    // Press Cmd+Enter to exit table
    await page.keyboard.press('Meta+Enter');

    // Type to verify we're below the table
    await page.keyboard.type('Below table');
    await editor.waitForSync();

    const updatedContent = await editor.getLastUpdateContent();
    expect(updatedContent).toContain('Below table');
    // Should be after the table
    expect(updatedContent.indexOf('Below table')).toBeGreaterThan(updatedContent.indexOf('Cell 2'));
  });

  test('Cmd+Enter in table header inserts paragraph below', async ({ page }) => {
    const content = `| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |`;
    await editor.load(content);

    // Click in header cell
    const header = editor.proseMirror.locator('th').first();
    await header.click();

    // Press Cmd+Enter
    await page.keyboard.press('Meta+Enter');

    // Type to verify we exited
    await page.keyboard.type('Exited');
    await editor.waitForSync();

    const updatedContent = await editor.getLastUpdateContent();
    expect(updatedContent).toContain('Exited');
  });
});
