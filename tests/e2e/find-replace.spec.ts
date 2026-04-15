import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('find highlights matches', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('Hello world. Hello again.');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-find')));
  await page.locator('.pm-find-input').fill('Hello');
  await expect(page.locator('.pm-find-match')).toHaveCount(2);
  await expect(page.locator('.pm-find-counter')).toContainText('1 of 2');
});

test('replace replaces current match', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('foo bar foo');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-find-replace')));
  await page.locator('.pm-find-input').fill('foo');
  await page.locator('.pm-replace-input').fill('baz');
  await page.locator('.pm-replace-btn').click();
  const content = await editor.getContent();
  expect(content).toContain('baz bar foo');
});

test('replace all replaces every match', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('cat and cat and cat');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-find-replace')));
  await page.locator('.pm-find-input').fill('cat');
  await page.locator('.pm-replace-input').fill('dog');
  await page.locator('.pm-replace-all-btn').click();
  const content = await editor.getContent();
  expect(content).toContain('dog and dog and dog');
});

test('escape closes find bar', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('test content');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('open-find')));
  await expect(page.locator('.pm-find-bar')).toBeVisible();
  await page.locator('.pm-find-input').press('Escape');
  await expect(page.locator('.pm-find-bar')).not.toBeVisible();
});

test('find bar hidden by default', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('some content');
  await expect(page.locator('.pm-find-bar')).not.toBeVisible();
});
