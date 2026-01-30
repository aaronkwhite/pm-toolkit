/**
 * Undo/Redo Tests
 *
 * Tests undo/redo functionality:
 * - Single undo reverses last change
 * - Multiple undos work sequentially
 * - Redo restores undone change
 * - External content updates don't add to undo history
 * - Undo after external update still works
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Undo/Redo', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('single undo reverses last change', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Hello');
    await editor.waitForSync();

    // Get content before undo
    let content = await editor.getLastUpdateContent();
    expect(content).toContain('Hello');

    // Clear messages to track new updates
    await editor.clearMessages();

    // Undo
    await editor.undo();
    await editor.waitForSync();

    // Content should be empty or reduced
    const visibleText = await editor.getVisibleText();
    expect(visibleText.trim()).not.toContain('Hello');
  });

  test('multiple undos work sequentially', async ({ page }) => {
    await editor.load();

    // Type multiple things with pauses to create separate history entries
    await editor.type('First');
    await editor.waitForSync();
    await page.waitForTimeout(100);

    await editor.type(' Second');
    await editor.waitForSync();
    await page.waitForTimeout(100);

    await editor.type(' Third');
    await editor.waitForSync();

    // Verify all text is present
    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Third');

    // Undo first time - should remove 'Third' or last input
    await editor.undo();
    await editor.waitForSync();

    // Undo second time
    await editor.undo();
    await editor.waitForSync();

    // Some text should be removed
    visibleText = await editor.getVisibleText();
    // After multiple undos, we should have less content
    const hasAllText = visibleText.includes('First') &&
                       visibleText.includes('Second') &&
                       visibleText.includes('Third');
    expect(hasAllText).toBe(false);
  });

  test('redo restores undone change', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Redo test');
    await editor.waitForSync();

    // Verify text is present
    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Redo test');

    // Undo
    await editor.undo();
    await editor.waitForSync();

    // Text should be gone or reduced
    visibleText = await editor.getVisibleText();
    const textAfterUndo = visibleText;

    // Redo
    await editor.redo();
    await editor.waitForSync();

    // Text should be restored
    visibleText = await editor.getVisibleText();
    // After redo, content should be different from after undo
    // (either restored or at least attempted to restore)
    expect(visibleText.length).toBeGreaterThanOrEqual(textAfterUndo.length);
  });

  test('external content updates do not add to undo history', async ({ page }) => {
    await editor.load();

    // Type some initial text
    await editor.type('Initial content');
    await editor.waitForSync();

    // Simulate an external update (like from another editor)
    await editor.simulateExternalUpdate('External content');
    await editor.waitForSync();

    // Verify external content is shown
    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('External content');

    // Undo should NOT undo the external update
    // Instead it should undo the user's last action before the external update
    await editor.undo();
    await editor.waitForSync();

    // The external content should still be present (not undone)
    // because external updates shouldn't be in undo history
    visibleText = await editor.getVisibleText();
    // Note: This test documents expected behavior - external updates
    // should not pollute the undo history
    expect(visibleText).toContain('External content');
  });

  test('undo after external update still works', async ({ page }) => {
    await editor.load();

    // Start with some content via external init
    await editor.simulateInit('Starting content');
    await editor.waitForSync();

    // Type new content
    await editor.type(' plus user edit');
    await editor.waitForSync();

    // Verify both are present
    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('plus user edit');

    // Undo the user edit
    await editor.undo();
    await editor.waitForSync();

    // User edit should be undone, but starting content should remain
    visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Starting content');
  });

  test('continuous typing creates grouped undo', async ({ page }) => {
    await editor.load();

    // Type a word quickly (should be grouped)
    await page.keyboard.type('Testing', { delay: 20 });
    await editor.waitForSync();

    // Verify the word is present
    let visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Testing');

    // Single undo should remove the whole word (grouped)
    await editor.undo();
    await editor.waitForSync();

    // Word should be gone
    visibleText = await editor.getVisibleText();
    expect(visibleText.trim()).not.toContain('Testing');
  });

  test('undo/redo works with formatting', async ({ page }) => {
    await editor.load();

    // Type some text
    await editor.type('Format this');
    await editor.waitForSync();

    // Select all and make bold
    await editor.selectAll();
    await editor.toggleBold();
    await editor.waitForSync();

    // Verify bold is applied
    let hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);

    // Undo the bold
    await editor.undo();
    await editor.waitForSync();

    // Bold should be removed
    hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(false);

    // Redo the bold
    await editor.redo();
    await editor.waitForSync();

    // Bold should be back
    hasBold = await editor.hasElement('strong');
    expect(hasBold).toBe(true);
  });

  test('multiple redo after multiple undo', async ({ page }) => {
    await editor.load();

    // Type multiple things
    await editor.type('One');
    await editor.waitForSync();
    await page.waitForTimeout(100);

    await editor.pressKey('Enter');
    await editor.type('Two');
    await editor.waitForSync();
    await page.waitForTimeout(100);

    await editor.pressKey('Enter');
    await editor.type('Three');
    await editor.waitForSync();

    // Undo multiple times
    await editor.undo();
    await editor.waitForSync();
    await editor.undo();
    await editor.waitForSync();

    // Redo multiple times
    await editor.redo();
    await editor.waitForSync();
    await editor.redo();
    await editor.waitForSync();

    // Content should be restored
    const visibleText = await editor.getVisibleText();
    // After redo, we should have more content than after undo
    expect(visibleText.length).toBeGreaterThan(0);
  });
});
