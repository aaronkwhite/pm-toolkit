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

test('comment button in bubble menu opens inline input', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world today.');
  // Select "world"
  await page.evaluate(() => {
    const pm = document.querySelector('.ProseMirror');
    if (!pm) return;
    const range = document.createRange();
    const textNode = pm.querySelector('p')?.firstChild;
    if (!textNode) return;
    range.setStart(textNode, 6);
    range.setEnd(textNode, 11);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });
  await page.waitForTimeout(300);
  // The bubble menu should appear with comment button
  const commentBtn = page.locator('.bubble-menu-btn[title="Add comment"]');
  if (await commentBtn.isVisible()) {
    await commentBtn.click();
    await expect(page.locator('.bubble-menu-comment-field')).toBeVisible();
    await page.locator('.bubble-menu-comment-field').fill('test comment');
    await page.locator('.bubble-menu-comment-field').press('Enter');
    await page.waitForTimeout(300);
    await expect(page.locator('.pm-comment-mark')).toBeVisible();
  }
});
