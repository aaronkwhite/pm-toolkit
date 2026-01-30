/**
 * Basic Editor Tests
 *
 * Tests fundamental editor functionality:
 * - Loading with placeholder
 * - Loading with initial content
 * - WYSIWYG rendering
 * - Typing and content updates
 * - postMessage communication
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Basic Editor', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('loads with placeholder when empty', async ({ page }) => {
    await editor.load();

    // Editor should be visible
    await expect(editor.proseMirror).toBeVisible();

    // Placeholder should be visible
    const isPlaceholderVisible = await editor.isPlaceholderVisible();
    expect(isPlaceholderVisible).toBe(true);

    // Placeholder should have correct text
    const placeholderText = await editor.getPlaceholderText();
    expect(placeholderText).toContain('Start typing');
  });

  test('loads with initial markdown content', async ({ page }) => {
    const content = '# Hello World\n\nThis is a test paragraph.';
    await editor.load(content);

    // Content should be rendered
    const hasH1 = await editor.hasElement('h1');
    expect(hasH1).toBe(true);

    // H1 should contain the correct text
    const h1Text = await editor.getElementText('h1');
    expect(h1Text).toBe('Hello World');

    // Paragraph should be present
    const paragraphs = await editor.countElements('p');
    expect(paragraphs).toBeGreaterThanOrEqual(1);
  });

  test('renders content as WYSIWYG (not raw markdown)', async ({ page }) => {
    const content = '**bold text** and *italic text*';
    await editor.load(content);

    // Should have strong element for bold
    const hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);

    // Should have em element for italic
    const hasItalic = await editor.hasElement('em');
    expect(hasItalic).toBe(true);

    // Visible text should NOT contain asterisks
    const visibleText = await editor.getVisibleText();
    expect(visibleText).not.toContain('**');
    expect(visibleText).not.toContain('*italic*');
    expect(visibleText).toContain('bold text');
    expect(visibleText).toContain('italic text');
  });

  test('typing text updates content', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Hello, World!');

    // Wait for debounce
    await editor.waitForSync();

    // An update message should have been sent
    const updateContent = await editor.getLastUpdateContent();
    expect(updateContent).toBeTruthy();
    expect(updateContent).toContain('Hello, World!');
  });

  test('sends ready message on load', async ({ page }) => {
    // Navigate without using load() so we can check messages
    await page.goto('/');
    await editor.proseMirror.waitFor({ state: 'visible' });

    // Wait a bit for initialization
    await page.waitForTimeout(500);

    // Should have sent a ready message
    const messages = await editor.getMessages('ready');
    expect(messages.length).toBeGreaterThan(0);
    expect((messages[0] as any).type).toBe('ready');
  });

  test('updates are sent via postMessage', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Test content');
    await editor.waitForSync();

    // Check that an update message was sent
    const updates = await editor.getMessages('update');
    expect(updates.length).toBeGreaterThan(0);

    // The update should contain the content
    const lastUpdate = updates[updates.length - 1] as any;
    expect(lastUpdate.type).toBe('update');
    expect(lastUpdate.payload).toBeDefined();
    expect(lastUpdate.payload.content).toContain('Test content');
  });

  test('renders multiple markdown elements correctly', async ({ page }) => {
    const content = `# Heading 1

## Heading 2

Regular paragraph with **bold** and *italic*.

- Bullet item 1
- Bullet item 2

1. Numbered item 1
2. Numbered item 2

> A blockquote

\`\`\`
code block
\`\`\`
`;

    await editor.load(content);

    // Check for various elements
    expect(await editor.hasElement('h1')).toBe(true);
    expect(await editor.hasElement('h2')).toBe(true);
    expect(await editor.hasElement('strong')).toBe(true);
    expect(await editor.hasElement('em')).toBe(true);
    expect(await editor.hasElement('ul')).toBe(true);
    expect(await editor.hasElement('ol')).toBe(true);
    expect(await editor.hasElement('blockquote')).toBe(true);
    expect(await editor.hasElement('pre')).toBe(true);
  });

  test('handles empty content gracefully', async ({ page }) => {
    await editor.load('');

    // Editor should be visible
    await expect(editor.proseMirror).toBeVisible();

    // Should show placeholder
    const isPlaceholderVisible = await editor.isPlaceholderVisible();
    expect(isPlaceholderVisible).toBe(true);
  });

  test('maintains focus after typing', async ({ page }) => {
    await editor.load();

    // Focus and type
    await editor.focus();
    await editor.type('Some text');

    // Editor should still be focused
    const isFocused = await editor.isFocused();
    expect(isFocused).toBe(true);
  });

  test('preserves line breaks in content', async ({ page }) => {
    const content = 'Line 1\n\nLine 2\n\nLine 3';
    await editor.load(content);

    // Should have multiple paragraphs
    const paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBeGreaterThanOrEqual(3);
  });

  test('empty paragraphs serialize to &nbsp; for preservation', async ({ page }) => {
    // Start with empty editor and type content with blank lines
    await editor.load('');

    // Type first line - use editor.type which clicks to focus first
    await editor.type('First line');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // Create empty paragraph
    await page.keyboard.type('After blank line');

    // Wait for debounce
    await page.waitForTimeout(300);

    // Get the markdown output
    const markdown = await editor.getContent();

    // The markdown should contain both lines
    expect(markdown).toContain('First line');
    expect(markdown).toContain('After blank line');

    // Check that we have &nbsp; markers for empty paragraphs
    // Empty paragraphs should serialize to \u00A0 (non-breaking space)
    const lines = markdown.split('\n');
    const nbspLines = lines.filter(line => line === '\u00A0');
    expect(nbspLines.length).toBeGreaterThanOrEqual(1);
  });

  test('&nbsp; lines in markdown become empty paragraphs when loaded', async ({ page }) => {
    // Load content with &nbsp; markers for empty paragraphs
    const content = 'Before empty\n\n\u00A0\n\nAfter empty';
    await editor.load(content);

    // Should render as multiple paragraphs including an empty one
    const paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBeGreaterThanOrEqual(3);

    // The middle paragraph should be empty (or contain just whitespace)
    const paragraphs = await page.locator('.ProseMirror p').allTextContents();
    const hasEmptyParagraph = paragraphs.some(p => p.trim() === '');
    expect(hasEmptyParagraph).toBe(true);
  });

  test('round-trip preserves empty paragraphs', async ({ page }) => {
    // Create content with intentional empty paragraphs
    await editor.load('');
    await editor.type('Line 1'); // Use editor.type to ensure focus
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // Create empty paragraph
    await page.keyboard.press('Enter'); // Another empty paragraph
    await page.keyboard.type('Line 2');

    // Wait for debounce
    await page.waitForTimeout(300);

    // Get markdown
    const markdown1 = await editor.getContent();
    expect(markdown1).toContain('Line 1'); // Sanity check

    // Reload the same content
    await editor.load(markdown1);

    // Trigger an update by typing a space and deleting it
    // This ensures an update message is sent
    await editor.focus();
    await page.keyboard.press('End'); // Go to end
    await page.keyboard.type(' ');
    await page.keyboard.press('Backspace');

    // Wait for debounce
    await page.waitForTimeout(300);

    // Get markdown again
    const markdown2 = await editor.getContent();

    // The two outputs should be identical - no information lost
    // Note: We compare the essential content, ignoring trailing newlines
    expect(markdown2.replace(/\n+$/, '')).toBe(markdown1.replace(/\n+$/, ''));
  });
});
