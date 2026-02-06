/**
 * Formatting Tests
 *
 * Tests text formatting:
 * - Bold toggle (Cmd/Ctrl+B)
 * - Italic toggle (Cmd/Ctrl+I)
 * - Inline code rendering
 * - Heading sizes
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Formatting', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('Cmd/Ctrl+B toggles bold on selection', async ({ page }) => {
    await editor.load();

    // Type text and select it
    await editor.type('Make this bold');
    await editor.selectAll();

    // Toggle bold
    await editor.toggleBold();
    await editor.waitForSync();

    // Should have strong element
    const hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);

    // Toggle bold again to remove
    await editor.toggleBold();
    await editor.waitForSync();

    // Should no longer have strong element
    const hasBoldAfter = await editor.hasElement('strong');
    expect(hasBoldAfter).toBe(false);
  });

  test('Cmd/Ctrl+I toggles italic on selection', async ({ page }) => {
    await editor.load();

    // Type text and select it
    await editor.type('Make this italic');
    await editor.selectAll();

    // Toggle italic
    await editor.toggleItalic();
    await editor.waitForSync();

    // Should have em element
    const hasItalic = await editor.hasElement('em');
    expect(hasItalic).toBe(true);

    // Toggle italic again to remove
    await editor.toggleItalic();
    await editor.waitForSync();

    // Should no longer have em element
    const hasItalicAfter = await editor.hasElement('em');
    expect(hasItalicAfter).toBe(false);
  });

  test('bold and italic can be combined', async ({ page }) => {
    await editor.load();

    // Type text and select it
    await editor.type('Bold and Italic');
    await editor.selectAll();

    // Apply both
    await editor.toggleBold();
    await editor.toggleItalic();
    await editor.waitForSync();

    // Should have both elements
    const hasBold = await editor.hasElement('strong');
    const hasItalic = await editor.hasElement('em');
    expect(hasBold).toBe(true);
    expect(hasItalic).toBe(true);
  });

  test('inline code renders with background', async ({ page }) => {
    const content = 'Here is `inline code` in text';
    await editor.load(content);

    // Should have code element
    const hasCode = await editor.hasElement('code');
    expect(hasCode).toBe(true);

    // Verify visible text contains the code without backticks
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('inline code');
    expect(visibleText).not.toContain('`');
  });

  test('code block renders in pre element', async ({ page }) => {
    const content = '```\nconst x = 1;\n```';
    await editor.load(content);

    // Should have pre element
    const hasPre = await editor.hasElement('pre');
    expect(hasPre).toBe(true);

    // Pre should contain code
    const hasCodeInPre = await editor.hasElement('pre code');
    expect(hasCodeInPre).toBe(true);
  });

  test('heading 1 renders at correct size', async ({ page }) => {
    const content = '# Heading 1';
    await editor.load(content);

    // Should have h1 element
    const hasH1 = await editor.hasElement('h1');
    expect(hasH1).toBe(true);

    // H1 should have correct text
    const h1Text = await editor.getElementText('h1');
    expect(h1Text).toBe('Heading 1');
  });

  test('heading 2 renders at correct size', async ({ page }) => {
    const content = '## Heading 2';
    await editor.load(content);

    // Should have h2 element
    const hasH2 = await editor.hasElement('h2');
    expect(hasH2).toBe(true);

    // H2 should have correct text
    const h2Text = await editor.getElementText('h2');
    expect(h2Text).toBe('Heading 2');
  });

  test('heading 3 renders at correct size', async ({ page }) => {
    const content = '### Heading 3';
    await editor.load(content);

    // Should have h3 element
    const hasH3 = await editor.hasElement('h3');
    expect(hasH3).toBe(true);

    // H3 should have correct text
    const h3Text = await editor.getElementText('h3');
    expect(h3Text).toBe('Heading 3');
  });

  test('all heading levels render correctly', async ({ page }) => {
    const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;
    await editor.load(content);

    // Check each heading level
    expect(await editor.hasElement('h1')).toBe(true);
    expect(await editor.hasElement('h2')).toBe(true);
    expect(await editor.hasElement('h3')).toBe(true);
    expect(await editor.hasElement('h4')).toBe(true);
    expect(await editor.hasElement('h5')).toBe(true);
    expect(await editor.hasElement('h6')).toBe(true);
  });

  test('strikethrough renders correctly', async ({ page }) => {
    const content = '~~strikethrough text~~';
    await editor.load(content);

    // Should have s element (strikethrough)
    const hasStrike = await editor.hasElement('s');
    expect(hasStrike).toBe(true);

    // Visible text should not contain tildes
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('strikethrough text');
    expect(visibleText).not.toContain('~~');
  });

  test('blockquote renders correctly', async ({ page }) => {
    const content = '> This is a quote';
    await editor.load(content);

    // Should have blockquote element
    const hasBlockquote = await editor.hasElement('blockquote');
    expect(hasBlockquote).toBe(true);

    // Quote text should be visible
    const quoteText = await editor.getElementText('blockquote');
    expect(quoteText).toContain('This is a quote');
  });

  test('horizontal rule renders correctly', async ({ page }) => {
    const content = 'Above\n\n---\n\nBelow';
    await editor.load(content);

    // Should have hr element
    const hasHr = await editor.hasElement('hr');
    expect(hasHr).toBe(true);
  });

  test('link renders correctly', async ({ page }) => {
    const content = '[Link text](https://example.com)';
    await editor.load(content);

    // Should have anchor element
    const hasLink = await editor.hasElement('a');
    expect(hasLink).toBe(true);

    // Link text should be visible (not the URL)
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Link text');
    expect(visibleText).not.toContain('https://example.com');
  });

  test('nested formatting works correctly', async ({ page }) => {
    const content = '**bold with *nested italic* inside**';
    await editor.load(content);

    // Should have both bold and italic
    const hasBold = await editor.hasElement('strong');
    const hasItalic = await editor.hasElement('em');
    expect(hasBold).toBe(true);
    expect(hasItalic).toBe(true);
  });

  test('formatting persists after sync', async ({ page }) => {
    await editor.load();

    // Type and format
    await editor.type('Persistent bold');
    await editor.selectAll();
    await editor.toggleBold();
    await editor.waitForSync();

    // Add more text on a new line
    // First deselect by pressing arrow key, then toggle bold OFF before adding new line
    await editor.pressKey('ArrowRight');
    await editor.toggleBold(); // Exit bold mode
    await editor.pressKey('Enter');
    await editor.type('More text');
    await editor.waitForSync();

    // Original bold should still be there
    const hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);

    // Get the update and verify bold markdown is generated
    const content = await editor.getLastUpdateContent();
    expect(content).toContain('**Persistent bold**');
  });

  test('formatting applies to partial selection', async ({ page }) => {
    await editor.load();

    // Type text - use a simple word to make selection easier
    await editor.type('Hello World');
    await editor.waitForSync();

    // Select "World" using double-click on the second word
    const paragraph = editor.proseMirror.locator('p').first();

    // Double-click on "World" part of the text to select just that word
    // Position near the end of text to hit "World"
    const box = await paragraph.boundingBox();
    if (box) {
      // Click on the right side of the text to select "World"
      await page.mouse.dblclick(box.x + box.width - 20, box.y + box.height / 2);
    }
    await page.waitForTimeout(50);

    // Apply bold to selection
    await editor.toggleBold();
    await editor.waitForSync();

    // Should have bold
    const hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);

    // The bold element should contain "World"
    const boldText = await editor.getElementText('strong');
    expect(boldText).toBe('World');
  });
});
