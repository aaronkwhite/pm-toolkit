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
