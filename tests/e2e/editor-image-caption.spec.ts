/**
 * Image Caption Tests
 *
 * Tests the caption functionality on images:
 * - Caption toggle button in popover toolbar shows/hides caption input
 * - Caption maps to alt text (![caption](src) in markdown)
 * - Caption is plain text input centered below image
 * - Toggling caption OFF hides it but preserves the alt text
 * - Toggling caption ON shows it again with the preserved text
 * - Caption input is editable and updates alt attribute
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Caption - Toggle', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('image with alt text shows caption by default', async ({ page }) => {
    const content = '![A beautiful landscape](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption input should be visible (because alt text exists)
    const caption = page.locator('.image-caption');
    await expect(caption).toBeVisible();

    // Caption should contain the alt text
    await expect(caption).toHaveValue('A beautiful landscape');
  });

  test('image without alt text does not show caption by default', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption should NOT be visible (no alt text)
    const caption = page.locator('.image-caption');
    await expect(caption).not.toBeVisible();
  });

  test('caption toggle button shows caption input', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption should not be visible initially
    const caption = page.locator('.image-caption');
    await expect(caption).not.toBeVisible();

    // Click the caption toggle button
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Caption should now be visible
    await expect(caption).toBeVisible();
  });

  test('caption toggle button hides caption when active', async ({ page }) => {
    const content = '![Has caption](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption should be visible
    const caption = page.locator('.image-caption');
    await expect(caption).toBeVisible();

    // Click the caption toggle button to hide
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Caption should now be hidden
    await expect(caption).not.toBeVisible();
  });

  test('caption toggle button has is-active class when caption is shown', async ({ page }) => {
    const content = '![Caption here](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption toggle button should be active
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await expect(captionBtn).toHaveClass(/is-active/);
  });
});

test.describe('Image Caption - Text Editing', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('typing in caption input updates alt text', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Toggle caption on
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Type in the caption input
    const caption = page.locator('.image-caption');
    await caption.click();
    await page.waitForTimeout(50);
    await page.keyboard.type('My custom caption');

    // Caption should have the typed text
    await expect(caption).toHaveValue('My custom caption');

    // The img element should have the alt text updated
    const imgAlt = await editor.proseMirror.locator('img.editor-image').getAttribute('alt');
    expect(imgAlt).toBe('My custom caption');
  });

  test('editing existing caption updates alt text', async ({ page }) => {
    const content = '![Original](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Select all caption text and replace
    const caption = page.locator('.image-caption');
    await caption.click();
    await page.waitForTimeout(50);

    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.type('Updated caption');

    // Caption should reflect the change
    await expect(caption).toHaveValue('Updated caption');
  });

  test('caption has placeholder text when empty', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Toggle caption on
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Caption input should have a placeholder
    const caption = page.locator('.image-caption');
    const placeholder = await caption.getAttribute('placeholder');
    expect(placeholder).toContain('caption');
  });

  test('Enter key in caption input blurs it', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click on the caption input
    const caption = page.locator('.image-caption');
    await caption.click();
    await page.waitForTimeout(50);

    // Press Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Caption input should no longer be focused
    const isFocused = await caption.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(false);
  });

  test('Escape key in caption input blurs it', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click on the caption input
    const caption = page.locator('.image-caption');
    await caption.click();
    await page.waitForTimeout(50);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Caption input should no longer be focused
    const isFocused = await caption.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(false);
  });
});

test.describe('Image Caption - Persistence', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('toggling caption OFF preserves alt text in the node', async ({ page }) => {
    const content = '![Preserved text](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Caption should be visible with text
    const caption = page.locator('.image-caption');
    await expect(caption).toBeVisible();
    await expect(caption).toHaveValue('Preserved text');

    // Toggle caption OFF
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Caption should be hidden
    await expect(caption).not.toBeVisible();

    // Alt text should still be preserved on the img element
    const imgAlt = await editor.proseMirror.locator('img.editor-image').getAttribute('alt');
    expect(imgAlt).toBe('Preserved text');
  });

  test('toggling caption ON restores previously set alt text', async ({ page }) => {
    const content = '![Remember me](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Toggle OFF
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Toggle ON again
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Caption should show the preserved text
    const caption = page.locator('.image-caption');
    await expect(caption).toBeVisible();
    await expect(caption).toHaveValue('Remember me');
  });

  test('caption text is serialized as alt text in markdown', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.clearMessages();

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Toggle caption on
    const toolbar = page.locator('.image-popover-toolbar');
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await captionBtn.click();
    await page.waitForTimeout(100);

    // Type a caption
    const caption = page.locator('.image-caption');
    await caption.click();
    await page.waitForTimeout(50);
    await page.keyboard.type('Photo caption');
    await page.waitForTimeout(100);

    // Wait for sync
    await editor.waitForSync();

    // Check that markdown contains the alt text
    const markdown = await editor.getContent();
    expect(markdown).toContain('![Photo caption](');
  });
});
