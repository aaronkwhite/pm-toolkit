/**
 * Image Node Serialization Tests
 *
 * Tests the ImageNode extension's markdown serialization and parsing:
 * - Standard markdown: ![alt](src)
 * - Width/alignment persisted as HTML comments: <!-- image: width=300 align=center -->
 * - Parser reads comments and applies attributes to following img elements
 * - Markdown input rule converts typed ![alt](url) to image nodes
 * - Paste handler converts pasted image markdown to image nodes
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Image Serialization - Standard Markdown', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('image serializes to standard markdown syntax', async ({ page }) => {
    const content = '![Alt text](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toContain('![Alt text](https://picsum.photos/300/200)');
  });

  test('image without alt text serializes with empty alt', async ({ page }) => {
    const content = '![](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toContain('![](https://picsum.photos/300/200)');
  });

  test('multiple images serialize correctly', async ({ page }) => {
    const content = `![First](https://picsum.photos/100/100)

![Second](https://picsum.photos/200/200)`;
    await editor.load(content);
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toContain('![First](https://picsum.photos/100/100)');
    expect(markdown).toContain('![Second](https://picsum.photos/200/200)');
  });
});

test.describe('Image Serialization - Metadata Comments', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('image with width serializes with comment metadata', async ({ page }) => {
    // Load content with width comment
    const content = '<!-- image: width=400 -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);
    await editor.waitForSync();

    // Trigger a content update to get serialized markdown
    await editor.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toMatch(/<!-- image: width=400 -->/);
    expect(markdown).toContain('![Test](https://picsum.photos/300/200)');
  });

  test('image with alignment serializes with comment metadata', async ({ page }) => {
    const content = '![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.clearMessages();

    // Click image and set alignment to center
    await editor.proseMirror.locator('img.editor-image').click();
    await page.waitForTimeout(100);

    const toolbar = page.locator('.image-popover-toolbar');
    await toolbar.locator('button[aria-label="Align center"]').click();
    await page.waitForTimeout(100);

    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toContain('align=center');
    expect(markdown).toContain('<!-- image:');
  });

  test('image with both width and alignment serializes both in comment', async ({ page }) => {
    const content = '<!-- image: width=350 align=right -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // Trigger a re-serialize
    await editor.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toMatch(/width=350/);
    expect(markdown).toMatch(/align=right/);
  });

  test('image without width or alignment has no comment', async ({ page }) => {
    const content = '![Simple](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).not.toContain('<!-- image:');
    expect(markdown).toContain('![Simple](https://picsum.photos/300/200)');
  });
});

test.describe('Image Serialization - Parsing Comments', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('width comment is parsed and applied to image', async ({ page }) => {
    const content = '<!-- image: width=500 -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // The image container should have the width applied
    const container = page.locator('.image-container');
    const style = await container.getAttribute('style');
    expect(style).toContain('500px');
  });

  test('alignment comment is parsed and applied to image', async ({ page }) => {
    const content = '<!-- image: align=center -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // The node view should have center alignment
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveAttribute('data-text-align', 'center');
  });

  test('comment with both width and alignment is parsed correctly', async ({ page }) => {
    const content = '<!-- image: width=400 align=right -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // Width should be applied
    const container = page.locator('.image-container');
    const style = await container.getAttribute('style');
    expect(style).toContain('400px');

    // Alignment should be applied
    const nodeView = page.locator('.image-node-view');
    await expect(nodeView).toHaveAttribute('data-text-align', 'right');
  });

  test('comment is not rendered as visible text', async ({ page }) => {
    const content = '<!-- image: width=300 -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // The comment should not appear as text
    const visibleText = await editor.getVisibleText();
    expect(visibleText).not.toContain('<!-- image:');
    expect(visibleText).not.toContain('width=300');
  });
});

test.describe('Image Serialization - Input Rules', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('typing ![alt](url) auto-converts to image', async ({ page }) => {
    await editor.focus();
    // tiptap-markdown auto-converts image markdown during typing
    await editor.type('![photo](https://picsum.photos/300/200)');
    await page.waitForTimeout(200);

    // Should have rendered as an image (auto-converted by markdown extension)
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Image should have correct attributes
    const img = editor.proseMirror.locator('img.editor-image');
    const src = await img.getAttribute('src');
    expect(src).toBe('https://picsum.photos/300/200');
  });

  test('typing ![alt](url) followed by Enter converts to image', async ({ page }) => {
    await editor.focus();
    await editor.type('![my photo](https://picsum.photos/400/300)');

    // Trigger conversion with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Should have rendered as an image
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);

    // Image should have correct attributes
    const img = editor.proseMirror.locator('img.editor-image');
    const src = await img.getAttribute('src');
    const alt = await img.getAttribute('alt');
    expect(src).toBe('https://picsum.photos/400/300');
    expect(alt).toBe('my photo');
  });

  test('pasting image markdown text converts to image node', async ({ page }) => {
    await editor.focus();

    // Type/paste image markdown (the editor should convert it)
    await editor.type('![pasted](https://picsum.photos/250/250)');
    await page.waitForTimeout(200);

    // After the input rule fires, should have an image
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(true);
  });

  test('partial image markdown is not converted', async ({ page }) => {
    await editor.focus();

    // Type incomplete markdown
    await editor.type('![missing closing');
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);

    // Should NOT have an image
    const hasImage = await editor.hasElement('img.editor-image');
    expect(hasImage).toBe(false);
  });
});

test.describe('Image Serialization - Round-trip', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('image markdown round-trips correctly', async ({ page }) => {
    const content = '![My Image](https://picsum.photos/300/200)';
    await editor.load(content);
    await editor.waitForSync();

    // Get the serialized markdown
    const markdown = await editor.getContent();
    expect(markdown).toContain('![My Image](https://picsum.photos/300/200)');
  });

  test('image with metadata round-trips correctly', async ({ page }) => {
    const content = '<!-- image: width=400 align=center -->\n![Test](https://picsum.photos/300/200)';
    await editor.load(content);
    await page.waitForTimeout(200);

    // Trigger re-serialize
    await editor.focus();
    await page.keyboard.press('End');
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toMatch(/width=400/);
    expect(markdown).toMatch(/align=center/);
    expect(markdown).toContain('![Test](https://picsum.photos/300/200)');
  });

  test('image among other content serializes correctly', async ({ page }) => {
    const content = `# Title

Some paragraph text.

![Photo](https://picsum.photos/300/200)

More text after.`;

    await editor.load(content);
    await editor.waitForSync();

    const markdown = await editor.getContent();
    expect(markdown).toContain('# Title');
    expect(markdown).toContain('Some paragraph text.');
    expect(markdown).toContain('![Photo](https://picsum.photos/300/200)');
    expect(markdown).toContain('More text after.');
  });
});
