/**
 * Image Handling Tests
 *
 * Tests core image functionality:
 * - Rendering images from markdown
 * - Remote images (HTTPS URLs)
 * - Local images (relative paths)
 * - Image deletion via node selection
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Rendering', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('renders remote image from markdown', async ({ page }) => {
    const content = '![Test Image](https://picsum.photos/536/354)';
    await editor.load(content);

    // Should have an image element (excluding ProseMirror internal separator images)
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Image should have correct src
    const imgSrc = await editor.proseMirror.locator('img.editor-image').getAttribute('src');
    expect(imgSrc).toBe('https://picsum.photos/536/354');
  });

  test('renders image with alt text', async ({ page }) => {
    const content = '![Beautiful landscape](https://picsum.photos/536/354)';
    await editor.load(content);

    // Image should have correct alt text
    const imgAlt = await editor.proseMirror.locator('img.editor-image').getAttribute('alt');
    expect(imgAlt).toBe('Beautiful landscape');
  });

  test('renders local image from relative path', async ({ page }) => {
    const content = '![Local Image](/test-files/images/one.jpg)';
    await editor.load(content);

    // Should have an image element
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Image should have the local path as src
    const imgSrc = await editor.proseMirror.locator('img.editor-image').getAttribute('src');
    expect(imgSrc).toBe('/test-files/images/one.jpg');
  });

  test('renders multiple images', async ({ page }) => {
    const content = `![Image One](/test-files/images/one.jpg)

![Image Two](/test-files/images/two.jpg)

![Remote Image](https://picsum.photos/536/354)`;
    await editor.load(content);

    // Should have three images (use .editor-image to exclude ProseMirror separators)
    const imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(3);
  });

  test('image renders inline with text', async ({ page }) => {
    const content = 'Here is an image: ![inline](https://picsum.photos/100/100) and more text.';
    await editor.load(content);

    // Should have the image
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Check the visible text contains both parts
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Here is an image:');
    expect(visibleText).toContain('and more text.');
  });

  test('pasting image markdown renders as image', async ({ page }) => {
    await editor.load();

    // Type/paste markdown image syntax
    await editor.type('![image](https://picsum.photos/536/354)');
    await editor.waitForSync();

    // Wait a bit for rendering
    await page.waitForTimeout(200);

    // Should render as an image, not raw markdown
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Should NOT show the raw markdown syntax in visible text
    const visibleText = await editor.getVisibleText();
    expect(visibleText).not.toContain('![image]');
  });
});

test.describe('Image Deletion', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('selecting image and pressing Backspace removes it', async ({ page }) => {
    const content = '![Test](https://picsum.photos/536/354)\n\nText after image';
    await editor.load(content);

    // Verify image exists
    let imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(1);

    // Click on the image to select it
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    // Press Backspace to delete the selected node
    await page.keyboard.press('Backspace');

    // Image should be deleted
    await page.waitForTimeout(100);
    imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(0);
  });
});

test.describe('Local Image Support', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('local image one.jpg renders correctly', async ({ page }) => {
    const content = '![Image One](/test-files/images/one.jpg)';
    await editor.load(content);

    // Image should render
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();

    // Image should have correct attributes
    const src = await img.getAttribute('src');
    expect(src).toBe('/test-files/images/one.jpg');
    const alt = await img.getAttribute('alt');
    expect(alt).toBe('Image One');
  });

  test('local image two.jpg renders correctly', async ({ page }) => {
    const content = '![Image Two](/test-files/images/two.jpg)';
    await editor.load(content);

    // Image should render
    const img = editor.proseMirror.locator('img.editor-image');
    await expect(img).toBeVisible();

    // Image should have correct attributes
    const src = await img.getAttribute('src');
    expect(src).toBe('/test-files/images/two.jpg');
    const alt = await img.getAttribute('alt');
    expect(alt).toBe('Image Two');
  });

  test('mixed local and remote images render together', async ({ page }) => {
    const content = `# Test Document

![Local Image](/test-files/images/one.jpg)

Some text between images.

![Remote Image](https://picsum.photos/536/354)

![Another Local](/test-files/images/two.jpg)`;

    await editor.load(content);

    // Should have three images
    const imageCount = await editor.countElements('img.editor-image');
    expect(imageCount).toBe(3);

    // Verify each image source
    const images = editor.proseMirror.locator('img.editor-image');
    const src0 = await images.nth(0).getAttribute('src');
    const src1 = await images.nth(1).getAttribute('src');
    const src2 = await images.nth(2).getAttribute('src');

    expect(src0).toBe('/test-files/images/one.jpg');
    expect(src1).toBe('https://picsum.photos/536/354');
    expect(src2).toBe('/test-files/images/two.jpg');
  });
});
