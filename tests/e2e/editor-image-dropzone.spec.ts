/**
 * Image Drop Zone Tests
 *
 * Tests the ImageDropZone component shown when an image node has no src:
 * - Slash command /image inserts an image node with empty src
 * - Drop zone UI appears with URL input and Browse button
 * - URL input accepts text and submits on Enter
 * - Escape in the URL input blurs it
 * - Drop zone has contentEditable=false to prevent ProseMirror interference
 * - Browse button sends requestFilePicker message to extension
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Drop Zone - Slash Command Insertion', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('/image slash command inserts image node with empty src', async ({ page }) => {
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // The image node should exist with empty src, showing the drop zone
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).toBeVisible();

    // Should NOT show an actual <img> element (no src yet)
    const imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(0);
  });

  test('drop zone shows URL input and Browse button', async ({ page }) => {
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // URL input should be visible
    const urlInput = page.locator('.image-drop-zone-input');
    await expect(urlInput).toBeVisible();

    // Browse button should be visible
    const browseBtn = page.locator('.image-drop-zone-btn');
    await expect(browseBtn).toBeVisible();
    await expect(browseBtn).toHaveText('Browse');
  });

  test('drop zone shows instructional text', async ({ page }) => {
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Should show instructional text
    const dropZoneText = page.locator('.image-drop-zone-text');
    await expect(dropZoneText).toBeVisible();
    const text = await dropZoneText.textContent();
    expect(text).toContain('Paste a URL or browse');
  });

  test('drop zone has contentEditable=false', async ({ page }) => {
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    const dropZone = page.locator('.image-drop-zone');
    const contentEditable = await dropZone.getAttribute('contenteditable');
    expect(contentEditable).toBe('false');
  });
});

test.describe('Image Drop Zone - URL Input', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();

    // Insert an image drop zone via slash command
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);
  });

  test('URL input accepts text', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);

    await page.keyboard.type('https://example.com/photo.png');
    await expect(urlInput).toHaveValue('https://example.com/photo.png');
  });

  test('submitting URL via Enter replaces drop zone with image', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);

    await page.keyboard.type('https://picsum.photos/300/200');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Drop zone should be gone
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).not.toBeVisible();

    // Image should now be rendered
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBe('https://picsum.photos/300/200');
  });

  test('empty URL input does not submit on Enter', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);

    // Press Enter with empty input
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Drop zone should still be visible (no submission happened)
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).toBeVisible();
  });

  test('Escape in URL input blurs the input', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);

    // Type some text
    await page.keyboard.type('partial');

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Input should no longer be focused
    const isFocused = await urlInput.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(false);
  });

  test('URL input has placeholder text', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    const placeholder = await urlInput.getAttribute('placeholder');
    expect(placeholder).toContain('https://');
  });
});

test.describe('Image Drop Zone - Browse Button', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();

    // Insert an image drop zone via slash command
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);
  });

  test('Browse button sends requestFilePicker message', async ({ page }) => {
    await editor.clearMessages();

    const browseBtn = page.locator('.image-drop-zone-btn');
    await browseBtn.click();
    await page.waitForTimeout(100);

    // Should have sent a requestFilePicker message
    const messages = await editor.getMessages('requestFilePicker');
    expect(messages.length).toBe(1);
    expect((messages[0] as any).type).toBe('requestFilePicker');
  });
});

test.describe('Image Drop Zone - ProseMirror Isolation', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();

    // Insert an image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);
  });

  test('typing in URL input does not affect editor content', async ({ page }) => {
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);

    // Type text that could be interpreted as ProseMirror commands
    await page.keyboard.type('https://example.com/test');

    // The editor should NOT have the URL as text content
    const visibleText = await editor.getVisibleText();
    expect(visibleText).not.toContain('https://example.com/test');

    // The input should have the value
    await expect(urlInput).toHaveValue('https://example.com/test');
  });
});
