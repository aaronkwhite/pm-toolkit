/**
 * Editor Workflow Tests
 *
 * Tests for real-world editing workflows that would frustrate users if broken.
 * These aren't feature tests - they're "does editing feel right?" tests.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Editing Workflows', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('markdown shortcuts work while typing', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type a heading using markdown shortcut
    await editor.type('# This is a heading');
    await editor.pressKey('Enter');
    await editor.waitForSync();

    // Should have converted to h1
    expect(await editor.hasElement('h1')).toBe(true);
    expect(await editor.getElementText('h1')).toBe('This is a heading');

    // Type bold using markdown shortcut
    await editor.type('This has **bold** text');
    await editor.waitForSync();

    // Should have converted to strong
    expect(await editor.hasElement('strong')).toBe(true);

    // Type a bullet list
    await editor.pressKey('Enter');
    await editor.type('- First item');
    await editor.pressKey('Enter');
    await editor.type('Second item');
    await editor.waitForSync();

    // Should have created a list
    expect(await editor.hasElement('ul')).toBe(true);
    const listItems = await editor.countElements('li');
    expect(listItems).toBeGreaterThanOrEqual(2);
  });

  test('backspace merges blocks correctly', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create two paragraphs
    await editor.type('First paragraph');
    await editor.pressKey('Enter');
    await editor.type('Second paragraph');
    await editor.waitForSync();

    // Should have 2 paragraphs
    let paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBe(2);

    // Move to start of second paragraph and backspace to merge
    await editor.pressKey('Home');
    await editor.pressKey('Backspace');
    await editor.waitForSync();

    // Should now be 1 paragraph with combined text
    paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBe(1);

    const text = await editor.getVisibleText();
    expect(text).toContain('First paragraphSecond paragraph');
  });

  test('copy and paste preserves content', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type some formatted content
    await editor.type('Hello **world**');
    await editor.waitForSync();

    // Select all and copy
    await editor.selectAll();
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+c`);

    // Move to end and paste
    await editor.pressKey('End');
    await editor.pressKey('Enter');
    await page.keyboard.press(`${modifier}+v`);
    await editor.waitForSync();

    // Should have duplicated content
    const boldCount = await editor.countElements('strong');
    expect(boldCount).toBe(2);

    const text = await editor.getVisibleText();
    expect(text).toContain('world');
  });

  test('cut and paste works', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Type content
    await editor.type('Cut this text');
    await editor.waitForSync();

    // Select all and cut
    await editor.selectAll();
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+x`);
    await editor.waitForSync();

    // Editor should be empty
    let text = await editor.getVisibleText();
    expect(text.trim()).toBe('');

    // Paste it back
    await page.keyboard.press(`${modifier}+v`);
    await editor.waitForSync();

    // Content should be restored
    text = await editor.getVisibleText();
    expect(text).toContain('Cut this text');
  });

  test('selecting across blocks and deleting works', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create multiple blocks
    await editor.type('Paragraph one');
    await editor.pressKey('Enter');
    await editor.type('Paragraph two');
    await editor.pressKey('Enter');
    await editor.type('Paragraph three');
    await editor.waitForSync();

    expect(await editor.countElements('p')).toBe(3);

    // Select all and delete
    await editor.selectAll();
    await editor.pressKey('Backspace');
    await editor.waitForSync();

    // Should be empty (or have single empty paragraph)
    const text = await editor.getVisibleText();
    expect(text.trim()).toBe('');
  });

  test('continuous editing flow feels natural', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Simulate a realistic editing session
    // 1. Start typing a paragraph
    await editor.type('This is my note');
    await editor.waitForSync();

    // 2. Fix a typo with backspace and continue
    await editor.pressKey('Backspace');
    await editor.pressKey('Backspace');
    await editor.pressKey('Backspace');
    await editor.pressKey('Backspace');
    await editor.typeWithoutClick('document');
    await editor.waitForSync();

    // 3. Add another paragraph
    await editor.pressKey('Enter');
    await editor.type('Second paragraph here');
    await editor.waitForSync();

    // 4. Go back to first paragraph and add text at the end
    await editor.pressKey('ArrowUp');
    await editor.pressKey('End');
    await editor.typeWithoutClick(' with more text');
    await editor.waitForSync();

    // 5. Undo that addition
    await editor.undo();
    await editor.waitForSync();

    // Verify the document makes sense
    const text = await editor.getVisibleText();
    expect(text).toContain('This is my document');
    expect(text).toContain('Second paragraph');
    // The "with more text" should be gone after undo
    expect(text).not.toContain('with more text');
  });
});
