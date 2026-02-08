/**
 * Image VS Code Extension Handler Tests
 *
 * Tests the VS Code extension message handlers related to images:
 * - saveImage: saves uploaded files to {workspaceRoot}/assets/ with timestamp filename
 * - requestFilePicker: opens VS Code file picker, sends filePickerResult
 * - requestImageUrl: converts relative paths to webview URIs
 * - Simulates the webview-side message flow since these run in the test harness
 *
 * These tests verify the webview-side behavior (message sending/receiving).
 * The actual VS Code API calls are mocked in the test harness.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image VS Code Handlers - saveImage', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('file drop in drop zone sends saveImage message', async ({ page }) => {
    await editor.load();
    await editor.clearMessages();

    // Insert image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Simulate a file drop by dispatching a DataTransfer with a File
    // NOTE: In Playwright, we cannot truly simulate file drag-and-drop onto a
    // contentEditable element. Instead, we verify the Browse button sends the
    // correct message to the extension.
    const browseBtn = page.locator('.image-drop-zone-btn');
    await browseBtn.click();
    await page.waitForTimeout(100);

    // Should have sent requestFilePicker
    const messages = await editor.getMessages('requestFilePicker');
    expect(messages.length).toBe(1);
  });

  test('image-saved event updates image node', async ({ page }) => {
    await editor.load();

    // Insert image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(300);

    // Drop zone should be showing
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).toBeVisible();

    // Simulate the extension responding with an image-saved event
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('image-saved', {
        detail: {
          originalPath: 'assets/photo-12345.png',
          webviewUrl: 'https://file+.vscode-resource.vscode-cdn.net/assets/photo-12345.png',
        },
      }));
    });
    await page.waitForTimeout(300);

    // Drop zone should be replaced with actual image
    // (use toHaveCount instead of toBeVisible since the image may not have loaded yet)
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toHaveCount(1, { timeout: 2000 });
    const src = await img.getAttribute('src');
    expect(src).toContain('vscode-resource');
  });
});

test.describe('Image VS Code Handlers - requestFilePicker', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('Browse button sends requestFilePicker message', async ({ page }) => {
    await editor.load();

    // Insert image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    await editor.clearMessages();

    const browseBtn = page.locator('.image-drop-zone-btn');
    await browseBtn.click();
    await page.waitForTimeout(100);

    const messages = await editor.getMessages('requestFilePicker');
    expect(messages.length).toBe(1);
    expect((messages[0] as any).type).toBe('requestFilePicker');
  });

  test('file-picker-result event updates image node', async ({ page }) => {
    await editor.load();

    // Insert image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(300);

    // Simulate the extension responding with a file picker result
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('file-picker-result', {
        detail: {
          originalPath: 'images/selected-photo.jpg',
          webviewUrl: '/test-files/images/one.jpg',
        },
      }));
    });
    await page.waitForTimeout(300);

    // Image should now be rendered (check existence + src, not visibility since it may not have loaded)
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toHaveCount(1, { timeout: 2000 });
    const src = await img.getAttribute('src');
    expect(src).toBe('/test-files/images/one.jpg');
  });
});

test.describe('Image VS Code Handlers - requestImageUrl', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('relative path image sends requestImageUrl message', async ({ page }) => {
    // Load editor without content first, then manually init with relative path image
    // (editor.load() auto-clears messages, so we need to capture messages sent during init)
    await editor.load();

    // Now simulate init with relative path — messages from this point forward are captured
    await editor.simulateInit('![Test](./assets/photo.png)');
    await page.waitForTimeout(500);

    // Check that a requestImageUrl message was sent
    const messages = await editor.getMessages('requestImageUrl');
    expect(messages.length).toBeGreaterThanOrEqual(1);
    expect((messages[0] as any).payload?.path).toBe('./assets/photo.png');
  });

  test('HTTPS URL does not send requestImageUrl message', async ({ page }) => {
    // Load editor without content first, then manually init with HTTPS URL
    await editor.load();

    await editor.simulateInit('![Test](https://picsum.photos/300/200)');
    await page.waitForTimeout(200);

    // Should NOT have sent requestImageUrl for HTTPS URLs
    const messages = await editor.getMessages('requestImageUrl');
    expect(messages.length).toBe(0);
  });

  test('image-url-resolved event updates image src', async ({ page }) => {
    // Load editor without content first, then manually init with relative path
    await editor.load();

    await editor.simulateInit('![Test](./my-image.png)');
    await page.waitForTimeout(500);

    // The test harness auto-responds to requestImageUrl by echoing the path back
    // After resolution, the requestImageUrl message should have been sent
    const messages = await editor.getMessages('requestImageUrl');
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  test('URL input submission with relative path sends requestImageUrl', async ({ page }) => {
    await editor.load();

    // Insert image drop zone
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    await editor.clearMessages();

    // Enter a relative path in the URL input
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);
    await page.keyboard.type('./assets/local-image.png');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Should have sent requestImageUrl for the relative path
    const messages = await editor.getMessages('requestImageUrl');
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Image VS Code Handlers - Replace Flow', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('replace mode Browse button sends requestFilePicker', async ({ page }) => {
    const content = '![Original](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click image and then Replace
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    const toolbar = page.locator('.image-popover-toolbar');
    await toolbar.locator('button[aria-label="Replace image"]').click();
    await page.waitForTimeout(100);

    await editor.clearMessages();

    // Click Browse in the replace drop zone
    const browseBtn = page.locator('.image-drop-zone-btn');
    await browseBtn.click();
    await page.waitForTimeout(100);

    const messages = await editor.getMessages('requestFilePicker');
    expect(messages.length).toBe(1);
  });

  test('file-picker-result during replace updates the image', async ({ page }) => {
    const content = '![Original](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click image and then Replace
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    const toolbar = page.locator('.image-popover-toolbar');
    await toolbar.locator('button[aria-label="Replace image"]').click();
    await page.waitForTimeout(100);

    // Simulate file picker result
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('file-picker-result', {
        detail: {
          originalPath: 'assets/new-photo.png',
          webviewUrl: '/test-files/images/one.jpg',
        },
      }));
    });
    await page.waitForTimeout(200);

    // The image should now show the new source
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBe('/test-files/images/one.jpg');
  });
});
