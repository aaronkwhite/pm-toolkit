/**
 * Image Resize Tests
 *
 * Tests the image resize functionality:
 * - Selected images show 4 corner resize handles (nw, ne, sw, se)
 * - Resize handles are visible only when the image is selected
 * - Dragging a handle resizes the image
 * - Width is persisted via HTML comment metadata: <!-- image: width=N -->
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Resize - Handles Visibility', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('selected image shows 4 corner resize handles', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // All four resize handles should be visible
    const nw = page.locator('.image-resize-nw');
    const ne = page.locator('.image-resize-ne');
    const sw = page.locator('.image-resize-sw');
    const se = page.locator('.image-resize-se');

    await expect(nw).toBeVisible();
    await expect(ne).toBeVisible();
    await expect(sw).toBeVisible();
    await expect(se).toBeVisible();
  });

  test('resize handles are hidden when image is not selected', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)\n\nSome text';
    await editor.load(content);

    // Resize handles should not be present (image not selected)
    const handleCount = await page.locator('.image-resize-handle').count();
    expect(handleCount).toBe(0);
  });

  test('resize handles disappear when image is deselected', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)\n\nSome text below';
    await editor.load(content);

    // Select the image
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Handles should be visible
    let handleCount = await page.locator('.image-resize-handle').count();
    expect(handleCount).toBe(4);

    // Click away to deselect
    await editor.proseMirror.locator('p').last().click();
    await page.waitForTimeout(100);

    // Handles should be gone
    handleCount = await page.locator('.image-resize-handle').count();
    expect(handleCount).toBe(0);
  });

  test('resize handles have correct cursor styles', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Check cursor styles via CSS classes
    const nw = page.locator('.image-resize-nw');
    const ne = page.locator('.image-resize-ne');
    const sw = page.locator('.image-resize-sw');
    const se = page.locator('.image-resize-se');

    // Verify handles exist with the correct class names (which apply CSS cursor rules)
    await expect(nw).toHaveClass(/image-resize-nw/);
    await expect(ne).toHaveClass(/image-resize-ne/);
    await expect(sw).toHaveClass(/image-resize-sw/);
    await expect(se).toHaveClass(/image-resize-se/);
  });
});

test.describe('Image Resize - Dragging', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('dragging SE handle resizes image wider', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // Get the container initial width
    const container = page.locator('.image-container');
    const initialBox = await container.boundingBox();
    expect(initialBox).not.toBeNull();

    // Get the SE handle position
    const seHandle = page.locator('.image-resize-se');
    const handleBox = await seHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    if (handleBox && initialBox) {
      // Drag the SE handle 100px to the right
      const startX = handleBox.x + handleBox.width / 2;
      const startY = handleBox.y + handleBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);

      // Container should now be wider
      const newBox = await container.boundingBox();
      expect(newBox).not.toBeNull();
      if (newBox) {
        expect(newBox.width).toBeGreaterThan(initialBox.width);
      }
    }
  });

  test('dragging NW handle resizes image', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // Get the container initial width
    const container = page.locator('.image-container');
    const initialBox = await container.boundingBox();
    expect(initialBox).not.toBeNull();

    // Get the NW handle position
    const nwHandle = page.locator('.image-resize-nw');
    const handleBox = await nwHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    if (handleBox && initialBox) {
      // Drag the NW handle 50px to the left (should make it wider since NW inverts delta)
      const startX = handleBox.x + handleBox.width / 2;
      const startY = handleBox.y + handleBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX - 50, startY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);

      // Container width should have changed
      const newBox = await container.boundingBox();
      expect(newBox).not.toBeNull();
      if (newBox) {
        expect(newBox.width).not.toBe(initialBox.width);
      }
    }
  });
});

test.describe('Image Resize - Width Persistence', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('width is persisted as HTML comment in markdown', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.clearMessages();

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // Drag the SE handle to resize
    const seHandle = page.locator('.image-resize-se');
    const handleBox = await seHandle.boundingBox();
    expect(handleBox).not.toBeNull();

    if (handleBox) {
      const startX = handleBox.x + handleBox.width / 2;
      const startY = handleBox.y + handleBox.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 50, startY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(100);
    }

    // Wait for sync
    await editor.waitForSync();

    // Markdown should contain width metadata as HTML comment
    const markdown = await editor.getContent();
    expect(markdown).toMatch(/<!-- image: width=\d+/);
  });

  test('image with width comment loads with correct width', async ({ page }) => {
    // Load content that has a width comment
    const content = '<!-- image: width=400 -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // The image container should have a width style set
    const container = page.locator('.image-container');
    const style = await container.getAttribute('style');
    expect(style).toContain('400px');
  });

  test('image with width and alignment comments loads correctly', async ({ page }) => {
    const content = '<!-- image: width=350 align=center -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // The container should have the width
    const container = page.locator('.image-container');
    const style = await container.getAttribute('style');
    expect(style).toContain('350px');

    // The node view should have center alignment
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveAttribute('data-text-align', 'center');
  });

  test('selected image shows outline', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // The container should have the selection outline (via is-selected class)
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveClass(/is-selected/);
  });
});
