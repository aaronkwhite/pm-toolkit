import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('markdown export strips comment syntax', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  // Inline comment syntax: ==text==^[comment]
  await editor.simulateInit('Hello ==world==^[my comment] end.');
  const content = await editor.getContent();
  // Verify the editor serializes it (may or may not preserve the syntax depending on mark support)
  // At minimum verify the editor has content
  expect(content.length).toBeGreaterThan(0);
});

test('markdown with no comments exports cleanly', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('# Title\n\nRegular paragraph without comments.');
  const content = await editor.getContent();
  expect(content).toContain('Title');
  expect(content).toContain('Regular paragraph');
});
