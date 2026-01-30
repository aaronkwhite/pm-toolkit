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
});
