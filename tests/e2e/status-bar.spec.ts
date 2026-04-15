import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('word counter shows correct count', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world today');
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-status-bar')).toBeVisible();
  await expect(page.locator('.pm-status-bar')).toContainText('3 words');
});

test('line counter shows correct count', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Line one\n\nLine two\n\nLine three');
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-status-bar')).toContainText('3 lines');
});

test('singular word form works', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello');
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-status-bar')).toContainText('1 word');
});

test('singular line form works', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world');
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-status-bar')).toContainText('1 line');
});

test('empty document shows zero counts', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('');
  await page.waitForTimeout(200);
  await expect(page.locator('.pm-status-bar')).toContainText('0 words');
  await expect(page.locator('.pm-status-bar')).toContainText('0 lines');
});
