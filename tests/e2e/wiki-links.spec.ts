import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('wiki link syntax renders as .pm-wiki-link element', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('See [[README]] for details.');
  await page.waitForTimeout(300);
  await expect(page.locator('.pm-wiki-link')).toBeVisible();
  await expect(page.locator('.pm-wiki-link')).toContainText('README');
});

test('wiki link serializes back to [[filename]] syntax', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('See [[my-file]] here.');
  await page.waitForTimeout(200);
  await page.locator('.ProseMirror').click();
  // Use the helper's canonical debounce wait instead of a magic number so
  // this test stays in sync if the debounce constant changes.
  await editor.waitForSync();
  const content = await editor.getContent();
  expect(content).toContain('[[my-file]]');
});

test('multiple wiki links render independently', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('See [[fileA]] and [[fileB]] here.');
  await page.waitForTimeout(300);
  await expect(page.locator('.pm-wiki-link')).toHaveCount(2);
});

test('wiki link click sends openFile message', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('See [[my-doc]] here.');
  await page.waitForTimeout(300);
  await page.locator('.pm-wiki-link').click();
  await page.waitForTimeout(200);
  const messages = await editor.getMessages('openFile') as any[];
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0].payload.path).toContain('my-doc');
});
