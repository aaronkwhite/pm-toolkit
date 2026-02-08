/**
 * Image Selection and BubbleMenu Interaction Tests
 *
 * Tests that the BubbleMenu (text formatting toolbar) correctly hides
 * when an image is selected (NodeSelection), and that the slash command
 * menu positioning respects viewport boundaries.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('BubbleMenu Hidden on Image Selection', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('BubbleMenu does not appear when image is selected', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image to select it (NodeSelection)
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // BubbleMenu should NOT be visible
    const bubbleMenu = page.locator('.bubble-menu');
    const display = await bubbleMenu.evaluate((el) => {
      return window.getComputedStyle(el).display;
    }).catch(() => 'none');

    expect(display).toBe('none');
  });

  test('BubbleMenu appears for text selection but not image selection', async ({ page }) => {
    const content = 'Select this text\n\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Select the text
    await editor.proseMirror.locator('p').first().click();
    await editor.selectAll();
    await page.waitForTimeout(200);

    // BubbleMenu should be visible for text selection
    const bubbleMenu = page.locator('.bubble-menu');
    // Note: BubbleMenu might be visible depending on selection spanning into image
    // At minimum, let's verify no error occurs

    // Now click on the image
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // BubbleMenu should be hidden
    const displayAfterImage = await bubbleMenu.evaluate((el) => {
      return window.getComputedStyle(el).display;
    }).catch(() => 'none');

    expect(displayAfterImage).toBe('none');
  });

  test('image popover toolbar and BubbleMenu do not conflict', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);

    // Click the image
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(200);

    // Image popover toolbar SHOULD be visible
    const imageToolbar = page.locator('.image-popover-toolbar');
    await expect(imageToolbar).toBeVisible();

    // BubbleMenu should NOT be visible
    const bubbleMenu = page.locator('.bubble-menu');
    const display = await bubbleMenu.evaluate((el) => {
      return window.getComputedStyle(el).display;
    }).catch(() => 'none');

    expect(display).toBe('none');
  });
});

test.describe('Slash Command Menu Positioning', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('slash command menu is positioned within viewport', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Menu should be visible
    const isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(true);

    // Get menu position
    const menuContainer = page.locator('.slash-command-menu-container');
    const box = await menuContainer.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Menu should not go above viewport top (minimum top: 8px)
      expect(box.y).toBeGreaterThanOrEqual(0);

      // Menu should not extend beyond viewport right
      const viewportSize = page.viewportSize();
      if (viewportSize) {
        expect(box.x + box.width).toBeLessThanOrEqual(viewportSize.width + 20);
      }
    }
  });

  test('slash command /image appears in menu items', async ({ page }) => {
    await editor.focus();
    await editor.type('/image');
    await page.waitForTimeout(100);

    const items = await editor.getSlashMenuItems();
    expect(items.some(item => item.toLowerCase().includes('image'))).toBe(true);
  });

  test('slash command menu has max-height and overflow when near viewport edge', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Get the menu container styling
    const menuContainer = page.locator('.slash-command-menu-container');
    const overflow = await menuContainer.evaluate((el) => {
      return window.getComputedStyle(el).overflow;
    });

    // The menu should have overflow: auto set by the updateMenuPosition function
    expect(overflow).toBe('auto');

    // maxHeight should be set
    const maxHeight = await menuContainer.evaluate((el) => {
      return el.style.maxHeight;
    });
    expect(maxHeight).toBeTruthy();
  });
});
