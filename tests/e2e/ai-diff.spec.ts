import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('showDiff message renders diff decorations', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world\n');
  await page.evaluate(() => {
    (window as any)._simulateMessage({
      type: 'showDiff',
      regions: [{ id: 'r1', type: 'added', fromPos: 1, toPos: 6, oldText: '', newText: 'Hello', mode: 'cursor' }],
      mode: 'cursor'
    });
  });
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-diff-added')).toBeVisible();
});

test('clearDiff removes decorations', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world\n');
  await page.evaluate(() => {
    (window as any)._simulateMessage({
      type: 'showDiff',
      regions: [{ id: 'r1', type: 'added', fromPos: 1, toPos: 6, oldText: '', newText: 'Hello', mode: 'cursor' }],
      mode: 'cursor'
    });
  });
  await page.waitForTimeout(100);
  await page.evaluate(() => (window as any)._simulateMessage({ type: 'clearDiff' }));
  await page.waitForTimeout(100);
  await expect(page.locator('.pm-diff-added')).not.toBeVisible();
});

test('claude-code mode shows DiffToolbar', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world\n');
  await page.evaluate(() => {
    (window as any)._simulateMessage({
      type: 'showDiff',
      regions: [{ id: 'r1', type: 'added', fromPos: 1, toPos: 6, oldText: '', newText: 'Hello', mode: 'claude-code' }],
      mode: 'claude-code'
    });
  });
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-diff-toolbar')).toBeVisible();
  await expect(page.locator('.pm-diff-accept')).toBeVisible();
});

test('cursor mode does not show DiffToolbar', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world\n');
  await page.evaluate(() => {
    (window as any)._simulateMessage({
      type: 'showDiff',
      regions: [{ id: 'r1', type: 'added', fromPos: 1, toPos: 6, oldText: '', newText: 'Hello', mode: 'cursor' }],
      mode: 'cursor'
    });
  });
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-diff-toolbar')).not.toBeVisible();
});

test('diff decorations apply to correct position in multi-paragraph document', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  // Two paragraphs — second paragraph starts at string offset 13 ("First para.\n" = 12 chars + newline)
  await editor.simulateInit('First para.\n\nSecond para.');
  // The string "Second" starts at offset 13 in the markdown
  // In PM, paragraph 1 occupies positions 0–13 (12 chars + 2 node tokens)
  // The actual PM position for "Second" is around 15
  // We test indirectly: apply a region at string offset 13 (start of second paragraph text)
  await page.evaluate(() => {
    (window as any)._simulateMessage({
      type: 'showDiff',
      regions: [{ id: 'r1', type: 'added', fromPos: 13, toPos: 19, oldText: '', newText: 'Second' }],
      mode: 'cursor'
    });
  });
  await page.waitForTimeout(300);
  // The decoration should be in the second paragraph, not the first
  const secondParaHasDecoration = await page.evaluate(() => {
    const paras = document.querySelectorAll('.ProseMirror p');
    if (paras.length < 2) return false;
    return paras[1].querySelector('.pm-diff-added') !== null;
  });
  expect(secondParaHasDecoration).toBe(true);
});
