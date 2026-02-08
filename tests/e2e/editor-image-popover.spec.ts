/**
 * Image Popover Toolbar Tests
 *
 * Tests the ImagePopoverToolbar component shown when an image is selected:
 * - Clicking an image shows the popover toolbar
 * - Toolbar has align left, center, right, caption toggle, replace, delete buttons
 * - Align buttons update the textAlign attribute
 * - Delete button removes the image node
 * - Replace button shows the drop zone (Escape cancels and restores the image)
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Popover Toolbar - Visibility', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('clicking an image shows the popover toolbar', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Popover toolbar should be visible
    const toolbar = page.locator('.image-popover-toolbar');
    await expect(toolbar).toBeVisible();
  });

  test('popover toolbar is hidden when image is not selected', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)\n\nSome text below';
    await editor.load(content);

    // Popover should not be visible initially
    const toolbar = page.locator('.image-popover-toolbar');
    await expect(toolbar).not.toBeVisible();
  });

  test('popover toolbar hides when clicking away from image', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)\n\nSome text below';
    await editor.load(content);

    // Click on the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Toolbar should be visible
    const toolbar = page.locator('.image-popover-toolbar');
    await expect(toolbar).toBeVisible();

    // Click on text below the image
    await editor.proseMirror.locator('p').last().click();
    await page.waitForTimeout(100);

    // Toolbar should be hidden
    await expect(toolbar).not.toBeVisible();
  });

  test('selected image has is-selected class on node view wrapper', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click on the image
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // The node view wrapper should have is-selected class
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveClass(/is-selected/);
  });
});

test.describe('Image Popover Toolbar - Buttons', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it and show toolbar
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);
  });

  test('toolbar has all expected buttons', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');

    // Check for alignment buttons
    const alignLeft = toolbar.locator('button[aria-label="Align left"]');
    const alignCenter = toolbar.locator('button[aria-label="Align center"]');
    const alignRight = toolbar.locator('button[aria-label="Align right"]');
    await expect(alignLeft).toBeVisible();
    await expect(alignCenter).toBeVisible();
    await expect(alignRight).toBeVisible();

    // Check for caption toggle button
    const captionBtn = toolbar.locator('button[aria-label="Toggle caption"]');
    await expect(captionBtn).toBeVisible();

    // Check for replace button
    const replaceBtn = toolbar.locator('button[aria-label="Replace image"]');
    await expect(replaceBtn).toBeVisible();

    // Check for delete button
    const deleteBtn = toolbar.locator('button[aria-label="Delete image"]');
    await expect(deleteBtn).toBeVisible();
  });

  test('separator exists between alignment and action buttons', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');
    const separator = toolbar.locator('.image-popover-separator');
    await expect(separator).toBeVisible();
  });

  test('align left is active by default', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');
    const alignLeft = toolbar.locator('button[aria-label="Align left"]');
    await expect(alignLeft).toHaveClass(/is-active/);
  });
});

test.describe('Image Popover Toolbar - Alignment', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);
  });

  test('clicking Align center updates alignment', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');
    const alignCenter = toolbar.locator('button[aria-label="Align center"]');

    await alignCenter.click();
    await page.waitForTimeout(100);

    // The node view should have center alignment data attribute
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveAttribute('data-text-align', 'center');

    // Align center button should now be active
    await expect(alignCenter).toHaveClass(/is-active/);
  });

  test('clicking Align right updates alignment', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');
    const alignRight = toolbar.locator('button[aria-label="Align right"]');

    await alignRight.click();
    await page.waitForTimeout(100);

    // The node view should have right alignment
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveAttribute('data-text-align', 'right');

    // Align right button should be active
    await expect(alignRight).toHaveClass(/is-active/);
  });

  test('clicking Align left resets alignment', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');

    // First set to center
    await toolbar.locator('button[aria-label="Align center"]').click();
    await page.waitForTimeout(100);

    // Then set back to left
    await toolbar.locator('button[aria-label="Align left"]').click();
    await page.waitForTimeout(100);

    // Left alignment clears the textAlign attribute (sets to null)
    // The node view should not have a data-text-align attribute or it should be absent
    const nodeView = page.locator('.image-node-view');
    const alignAttr = await nodeView.getAttribute('data-text-align');
    expect(alignAttr).toBeNull();
  });

  test('alignment is persisted in markdown output', async ({ page }) => {
    const toolbar = page.locator('.image-popover-toolbar');
    await editor.clearMessages();

    // Set center alignment
    await toolbar.locator('button[aria-label="Align center"]').click();
    await page.waitForTimeout(100);

    // Wait for sync
    await editor.waitForSync();

    // Check markdown content includes alignment metadata
    const content = await editor.getContent();
    expect(content).toContain('<!-- image:');
    expect(content).toContain('align=center');
  });
});

test.describe('Image Popover Toolbar - Delete', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('delete button removes the image node', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)\n\nText after';
    await editor.load(content);

    // Verify image exists
    let imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(1);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click delete button
    const toolbar = page.locator('.image-popover-toolbar');
    const deleteBtn = toolbar.locator('button[aria-label="Delete image"]');
    await deleteBtn.click();
    await page.waitForTimeout(100);

    // Image should be removed
    imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(0);

    // Surrounding text should remain
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Text after');
  });

  test('delete button removes image and toolbar disappears', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click delete
    const toolbar = page.locator('.image-popover-toolbar');
    const deleteBtn = toolbar.locator('button[aria-label="Delete image"]');
    await deleteBtn.click();
    await page.waitForTimeout(100);

    // Toolbar should be gone
    await expect(toolbar).not.toBeVisible();
  });
});

test.describe('Image Popover Toolbar - Replace', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('replace button shows drop zone with cancel text', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click replace button
    const toolbar = page.locator('.image-popover-toolbar');
    const replaceBtn = toolbar.locator('button[aria-label="Replace image"]');
    await replaceBtn.click();
    await page.waitForTimeout(100);

    // Drop zone should appear
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).toBeVisible();

    // Drop zone should show replace-specific text with Esc to cancel
    const dropZoneText = page.locator('.image-drop-zone-text');
    const text = await dropZoneText.textContent();
    expect(text).toContain('Replace image');
    expect(text).toContain('Esc to cancel');
  });

  test('Escape during replace cancels and restores image', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click replace
    const toolbar = page.locator('.image-popover-toolbar');
    const replaceBtn = toolbar.locator('button[aria-label="Replace image"]');
    await replaceBtn.click();
    await page.waitForTimeout(100);

    // Drop zone should appear
    const dropZone = page.locator('.image-drop-zone');
    await expect(dropZone).toBeVisible();

    // Press Escape to cancel
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Drop zone should be gone, original image restored
    await expect(dropZone).not.toBeVisible();

    // Original image should still be present
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBe('https://picsum.photos/300/200');
  });

  test('submitting new URL during replace updates the image', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Click replace
    const toolbar = page.locator('.image-popover-toolbar');
    const replaceBtn = toolbar.locator('button[aria-label="Replace image"]');
    await replaceBtn.click();
    await page.waitForTimeout(100);

    // Enter a new URL
    const urlInput = page.locator('.image-drop-zone-input');
    await urlInput.click();
    await page.waitForTimeout(50);
    await page.keyboard.type('https://picsum.photos/500/400');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Image should now have the new URL
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toBe('https://picsum.photos/500/400');
  });
});
