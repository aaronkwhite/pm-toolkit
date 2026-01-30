/**
 * Slash Command Tests
 *
 * Tests slash command menu functionality:
 * - Typing "/" opens command menu
 * - Arrow keys navigate menu
 * - Enter selects command
 * - Escape closes menu
 * - Commands insert correct content
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Slash Commands', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('typing "/" opens command menu', async ({ page }) => {
    // Focus editor and type /
    await editor.focus();
    await editor.type('/');

    // Menu should be visible
    await page.waitForTimeout(100); // Small wait for menu to appear
    const isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(true);
  });

  test('menu shows default commands', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Get menu items
    const items = await editor.getSlashMenuItems();

    // Should have common commands
    expect(items).toContain('Text');
    expect(items).toContain('Heading 1');
    expect(items).toContain('Bullet List');
    expect(items).toContain('Task List');
  });

  test('typing filters commands', async ({ page }) => {
    await editor.focus();
    await editor.type('/head');
    await page.waitForTimeout(100);

    // Get filtered items
    const items = await editor.getSlashMenuItems();

    // Should only show heading-related items
    expect(items.some((item) => item.toLowerCase().includes('heading'))).toBe(true);

    // Should not show unrelated items
    expect(items).not.toContain('Bullet List');
  });

  test('arrow down selects next item', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Get initial selection
    const initialSelection = await editor.getSelectedSlashMenuItem();

    // Press down arrow
    await editor.pressKey('ArrowDown');
    await page.waitForTimeout(50);

    // Selection should change
    const newSelection = await editor.getSelectedSlashMenuItem();
    expect(newSelection).not.toBe(initialSelection);
  });

  test('arrow up selects previous item', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Navigate down first
    await editor.pressKey('ArrowDown');
    await editor.pressKey('ArrowDown');
    await page.waitForTimeout(50);

    const afterDown = await editor.getSelectedSlashMenuItem();

    // Navigate up
    await editor.pressKey('ArrowUp');
    await page.waitForTimeout(50);

    const afterUp = await editor.getSelectedSlashMenuItem();
    expect(afterUp).not.toBe(afterDown);
  });

  test('Enter selects command and closes menu', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Type to filter to "Heading 1" (use short search term)
    await editor.type('h1');
    await page.waitForTimeout(100);

    // Press Enter to select the first result
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    // Menu should be closed
    const isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(false);

    // Editor should now have a heading
    const hasH1 = await editor.hasElement('h1');
    expect(hasH1).toBe(true);
  });

  test('Escape closes menu', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Verify menu is open
    let isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(true);

    // Press Escape
    await editor.pressKey('Escape');
    await page.waitForTimeout(100);

    // Menu should be closed
    isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(false);
  });

  test('selecting Text creates paragraph', async ({ page }) => {
    // Start with a heading
    await editor.simulateInit('# Heading');
    await editor.focus();
    await editor.pressKey('End');
    await editor.pressKey('Enter');

    // Use slash command to insert text/paragraph
    await editor.type('/text');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    // Type some content
    await editor.type('Regular paragraph');
    await editor.waitForSync();

    // Should have both heading and paragraph
    const hasH1 = await editor.hasElement('h1');
    const paragraphCount = await editor.countElements('p');
    expect(hasH1).toBe(true);
    expect(paragraphCount).toBeGreaterThanOrEqual(1);
  });

  test('selecting Heading 1 creates h1', async ({ page }) => {
    await editor.focus();
    await editor.type('/h1');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    // Type heading text
    await editor.type('My Heading');
    await editor.waitForSync();

    // Should have h1
    const hasH1 = await editor.hasElement('h1');
    expect(hasH1).toBe(true);

    const h1Text = await editor.getElementText('h1');
    expect(h1Text).toBe('My Heading');
  });

  test('selecting Heading 2 creates h2', async ({ page }) => {
    await editor.focus();
    await editor.type('/h2');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('Subheading');
    await editor.waitForSync();

    const hasH2 = await editor.hasElement('h2');
    expect(hasH2).toBe(true);
  });

  test('selecting Bullet List creates bullet list', async ({ page }) => {
    await editor.focus();
    await editor.type('/bullet');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('List item');
    await editor.waitForSync();

    const hasUl = await editor.hasElement('ul');
    expect(hasUl).toBe(true);
  });

  test('selecting Numbered List creates numbered list', async ({ page }) => {
    await editor.focus();
    await editor.type('/numbered');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('First item');
    await editor.waitForSync();

    const hasOl = await editor.hasElement('ol');
    expect(hasOl).toBe(true);
  });

  test('selecting Task List creates task list', async ({ page }) => {
    await editor.focus();
    await editor.type('/task');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('Todo item');
    await editor.waitForSync();

    const hasTaskList = await editor.hasElement('ul[data-type="taskList"]');
    expect(hasTaskList).toBe(true);
  });

  test('selecting Quote creates blockquote', async ({ page }) => {
    await editor.focus();
    await editor.type('/quote');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('A wise quote');
    await editor.waitForSync();

    const hasBlockquote = await editor.hasElement('blockquote');
    expect(hasBlockquote).toBe(true);
  });

  test('selecting Code Block creates code block', async ({ page }) => {
    await editor.focus();
    await editor.type('/code');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('const x = 1;');
    await editor.waitForSync();

    const hasPre = await editor.hasElement('pre');
    expect(hasPre).toBe(true);
  });

  test('selecting Divider creates horizontal rule', async ({ page }) => {
    await editor.focus();
    await editor.type('Before');
    await editor.pressKey('Enter');

    await editor.type('/divider');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('After');
    await editor.waitForSync();

    const hasHr = await editor.hasElement('hr');
    expect(hasHr).toBe(true);
  });

  test('selecting Table creates table', async ({ page }) => {
    await editor.focus();
    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    // Table should be created
    const hasTable = await editor.hasElement('table');
    expect(hasTable).toBe(true);

    // Default table has 3x3 cells with header row
    const thCount = await editor.countElements('th');
    const tdCount = await editor.countElements('td');
    expect(thCount).toBe(3); // 3 header cells
    expect(tdCount).toBe(6); // 2 rows * 3 columns
  });

  test('clicking menu item selects command', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Click on Heading 1 item
    const h1Item = page.locator('.slash-command-item', { hasText: 'Heading 1' });
    await h1Item.click();
    await page.waitForTimeout(100);

    // Menu should close and h1 should be created
    const isVisible = await editor.isSlashMenuVisible();
    expect(isVisible).toBe(false);

    const hasH1 = await editor.hasElement('h1');
    expect(hasH1).toBe(true);
  });

  test('menu shows "No results" for invalid query', async ({ page }) => {
    await editor.focus();
    await editor.type('/xyznonexistent');
    await page.waitForTimeout(100);

    // Menu should show no results
    const noResults = page.locator('.slash-command-empty');
    await expect(noResults).toBeVisible();
  });

  test('menu position updates correctly', async ({ page }) => {
    await editor.focus();
    await editor.type('/');
    await page.waitForTimeout(100);

    // Menu should be visible and positioned
    const menu = page.locator('.slash-command-menu');
    await expect(menu).toBeVisible();

    // Get menu position
    const box = await menu.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Menu should be within viewport
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
    }
  });

  test('slash command works after content', async ({ page }) => {
    await editor.simulateInit('Some existing content');
    await editor.focus();
    // Click at the end of existing content
    const paragraph = editor.proseMirror.locator('p').first();
    await paragraph.click();
    await editor.pressKey('ArrowRight'); // Move to end
    await editor.pressKey('ArrowRight');
    await editor.pressKey('ArrowRight');
    await editor.pressKey('Enter');

    // Use slash command
    await editor.type('/h2');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(100);

    await editor.type('New Section');
    await editor.waitForSync();

    // Should have the new heading
    const hasH2 = await editor.hasElement('h2');
    expect(hasH2).toBe(true);

    // Original content should still be there
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Some existing content');
    expect(visibleText).toContain('New Section');
  });
});
