import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('comment mark renders highlighted text', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello ==world==^[my comment] today.');
  await expect(page.locator('.pm-comment-mark')).toBeVisible();
  await expect(page.locator('.pm-comment-mark')).toContainText('world');
});

test('comments panel shows when comments exist', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello ==world==^[first comment] and ==more==^[second comment].');
  await expect(page.locator('.pm-comments-panel')).toBeVisible();
  await expect(page.locator('.pm-comment-entry')).toHaveCount(2);
});

test('comments panel hidden when no comments', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world, no comments here.');
  await expect(page.locator('.pm-comments-panel')).not.toBeVisible();
});

test('comment text appears in comments panel', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('See ==this important thing==^[needs review] for context.');
  await expect(page.locator('.pm-comment-text')).toContainText('needs review');
  await expect(page.locator('.pm-comment-highlight')).toContainText('this important thing');
});
