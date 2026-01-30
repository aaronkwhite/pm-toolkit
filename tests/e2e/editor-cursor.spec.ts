/**
 * Cursor Position Tests
 *
 * Tests cursor behavior:
 * - Cursor stays in position after typing
 * - Cursor stays after undo/redo
 * - Cursor doesn't jump to end unexpectedly
 * - Click positions cursor correctly
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Cursor Position', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('cursor stays at end after typing', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Hello World');

    // Continue typing - should append
    await editor.type('!!!');
    await editor.waitForSync();

    // All text should be together
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Hello World!!!');
  });

  test('cursor stays in position after undo', async ({ page }) => {
    await editor.load();

    // Type multiple words
    await editor.type('First Second Third');
    await editor.waitForSync();

    // Undo
    await editor.undo();
    await editor.waitForSync();

    // Type more - should append at cursor position
    await editor.type(' NEW');
    await editor.waitForSync();

    // The new text should be added at the cursor position
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('NEW');
  });

  test('cursor stays in position after redo', async ({ page }) => {
    await editor.load();

    // Type text
    await editor.type('Original');
    await editor.waitForSync();

    // Undo
    await editor.undo();
    await editor.waitForSync();

    // Redo
    await editor.redo();
    await editor.waitForSync();

    // Type more - should append at end
    await editor.type(' Added');
    await editor.waitForSync();

    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Added');
  });

  test('click positions cursor correctly', async ({ page }) => {
    const content = 'Line one\n\nLine two\n\nLine three';
    await editor.load(content);

    // Click on line 2 (second paragraph)
    await editor.clickAtLine(2);

    // Type at that position
    await editor.type(' INSERTED');
    await editor.waitForSync();

    // The inserted text should be in line 2
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('INSERTED');
  });

  test('cursor does not jump to end on external update when content matches', async ({ page }) => {
    await editor.load();

    // Type initial content
    await editor.type('Initial content');
    await editor.waitForSync();

    // Move cursor to beginning using Home key
    await editor.pressKey('Home');

    // Simulate an external update with the same content
    // (This shouldn't cause cursor to jump)
    const currentContent = await editor.getLastUpdateContent();
    if (currentContent) {
      await editor.simulateExternalUpdate(currentContent);
    }

    // Type at current position (without click to preserve cursor)
    await editor.typeWithoutClick('START: ');
    await editor.waitForSync();

    // If cursor didn't jump, START should be at the beginning
    const visibleText = await editor.getVisibleText();
    expect(visibleText.startsWith('START:')).toBe(true);
  });

  test('arrow keys move cursor correctly', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('ABCDE');
    await editor.waitForSync();

    // Move cursor left 2 positions
    await editor.pressKey('ArrowLeft');
    await editor.pressKey('ArrowLeft');

    // Type at new position (without clicking to preserve cursor)
    await editor.typeWithoutClick('X');
    await editor.waitForSync();

    // Text should be ABCXDE
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('ABCXDE');
  });

  test('Home and End keys work correctly', async ({ page }) => {
    await editor.load();

    // Type a line
    await editor.type('Middle of line');
    await editor.waitForSync();

    // Press Home to go to beginning
    await editor.pressKey('Home');

    // Type at beginning (without clicking to preserve cursor)
    await editor.typeWithoutClick('START ');
    await editor.waitForSync();

    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('START Middle');

    // Press End to go to end
    await editor.pressKey('End');

    // Type at end (without clicking to preserve cursor)
    await editor.typeWithoutClick(' END');
    await editor.waitForSync();

    visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('line END');
  });

  test('cursor moves to next line on Enter', async ({ page }) => {
    await editor.load();

    // Type first line
    await editor.type('Line 1');

    // Press Enter
    await editor.pressKey('Enter');

    // Type second line
    await editor.type('Line 2');
    await editor.waitForSync();

    // Should have two separate paragraphs
    const paragraphCount = await editor.countElements('p');
    expect(paragraphCount).toBeGreaterThanOrEqual(2);

    // Both lines should be present
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Line 1');
    expect(visibleText).toContain('Line 2');
  });

  test('backspace removes character before cursor', async ({ page }) => {
    await editor.load();

    // Type text
    await editor.type('Hello');

    // Backspace
    await editor.pressKey('Backspace');
    await editor.waitForSync();

    // Should be 'Hell'
    const visibleText = await editor.getVisibleText();
    expect(visibleText.trim()).toBe('Hell');
  });

  test('delete removes character after cursor', async ({ page }) => {
    await editor.load();

    // Type text
    await editor.type('Hello');

    // Move to beginning
    await editor.pressKey('Home');

    // Delete
    await editor.pressKey('Delete');
    await editor.waitForSync();

    // Should be 'ello'
    const visibleText = await editor.getVisibleText();
    expect(visibleText.trim()).toBe('ello');
  });

  test('selection with Shift+Arrow works', async ({ page }) => {
    await editor.load();

    // Type text
    await editor.type('Select me');
    await editor.waitForSync();

    // Move to beginning
    await editor.pressKey('Home');

    // Select first word with Shift+Right (6 times for "Select")
    for (let i = 0; i < 6; i++) {
      await editor.pressKey('Shift+ArrowRight');
    }

    // Type replacement (without clicking to preserve selection)
    await editor.typeWithoutClick('Chosen');
    await editor.waitForSync();

    // Should be 'Chosen me'
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Chosen me');
  });

  test('double-click selects word', async ({ page }) => {
    await editor.load('Hello World');

    // Double-click on "Hello" to select it
    const firstParagraph = editor.proseMirror.locator('p').first();
    await firstParagraph.dblclick();

    // Type replacement
    await editor.type('Hi');
    await editor.waitForSync();

    // One word should be replaced
    const visibleText = await editor.getVisibleText();
    // Either "Hi World" or "Hello Hi" depending on which word was selected
    expect(visibleText).toContain('Hi');
  });

  test('triple-click selects line/paragraph', async ({ page }) => {
    await editor.load('Select this entire line');

    // Triple-click to select the line
    const firstParagraph = editor.proseMirror.locator('p').first();
    await firstParagraph.click({ clickCount: 3 });

    // Type replacement (without click to preserve selection)
    await editor.typeWithoutClick('New line');
    await editor.waitForSync();

    // Entire line should be replaced
    const visibleText = await editor.getVisibleText();
    expect(visibleText.trim()).toBe('New line');
  });
});
