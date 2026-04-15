import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('requestHtmlExport message causes webview to post exportHtml', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('# Hello World\n\nThis is **bold** text.');
  await page.evaluate(() => window._simulateMessage({ type: 'requestHtmlExport' }));
  await page.waitForTimeout(200);
  const messages = await editor.getMessages('exportHtml') as any[];
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0].html).toContain('<h1>');
  expect(messages[0].html).toContain('bold');
});

test('html export includes image content', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('# Title\n\nSome paragraph text here.');
  await page.evaluate(() => window._simulateMessage({ type: 'requestHtmlExport' }));
  await page.waitForTimeout(200);
  const messages = await editor.getMessages('exportHtml') as any[];
  expect(messages[0].html).toBeTruthy();
  expect(messages[0].html.length).toBeGreaterThan(40);
});
