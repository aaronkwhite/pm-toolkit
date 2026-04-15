import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('note callout renders with correct class', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('> [!NOTE]\n> This is a note.');
  await page.waitForTimeout(300);
  await expect(page.locator('.pm-callout-note')).toBeVisible();
  await expect(page.locator('.pm-callout-note')).toContainText('This is a note.');
});

test('warning callout renders with correct class', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('> [!WARNING]\n> Be careful here.');
  await page.waitForTimeout(300);
  await expect(page.locator('.pm-callout-warning')).toBeVisible();
  await expect(page.locator('.pm-callout-warning')).toContainText('Be careful here.');
});

test('tip callout renders with correct class', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('> [!TIP]\n> This is a tip.');
  await page.waitForTimeout(300);
  await expect(page.locator('.pm-callout-tip')).toBeVisible();
});

test('callout serializes back to > [!TYPE] syntax', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('> [!NOTE]\n> Remember this.');
  await page.waitForTimeout(200);
  await page.locator('.ProseMirror').click();
  await page.waitForTimeout(350); // wait for debounce
  const content = await editor.getContent();
  expect(content).toContain('[!NOTE]');
  expect(content).toContain('Remember this.');
});
