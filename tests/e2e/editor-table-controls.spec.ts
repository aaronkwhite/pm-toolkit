/**
 * Table Controls Tests
 *
 * Tests for table grip handles, context menu, add bars, and column width persistence.
 * These features are provided by TableControls.ts and CustomTable.ts.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

/** Helper to create a 3x3 table via slash command */
async function createTable(editor: EditorHelper, page: import('@playwright/test').Page) {
  await editor.focus();
  await editor.type('/table');
  await page.waitForTimeout(100);
  await editor.pressKey('Enter');
  await page.waitForTimeout(100);
  await editor.pressKey('Enter'); // Confirm default 3x3
  await page.waitForTimeout(300);
}

test.describe('Table Controls - Grips', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('row grip appears when hovering a body row cell', async ({ page }) => {
    await createTable(editor, page);

    // Hover over a body cell (row 2, col 1)
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await expect(rowGrip).toBeVisible();
  });

  test('column grip appears when hovering a cell', async ({ page }) => {
    await createTable(editor, page);

    // Hover over a body cell
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const colGrip = page.locator('.table-col-grip.visible');
    await expect(colGrip).toBeVisible();
  });

  test('row grip does NOT appear for header row', async ({ page }) => {
    await createTable(editor, page);

    // Hover over a header cell
    const headerCell = editor.proseMirror.locator('th').first();
    await headerCell.hover();
    await page.waitForTimeout(200);

    // Row grip should not be visible (header row index is 0, grips skip it)
    const rowGrip = page.locator('.table-row-grip.visible');
    await expect(rowGrip).toHaveCount(0);
  });

  test('grips hide when mouse leaves the table', async ({ page }) => {
    await createTable(editor, page);

    // Hover a body cell to show grips
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    // Move mouse away from table
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);

    const rowGrip = page.locator('.table-row-grip.visible');
    await expect(rowGrip).toHaveCount(0);
  });
});

test.describe('Table Controls - Context Menu', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('clicking row grip opens context menu', async ({ page }) => {
    await createTable(editor, page);

    // Hover body cell to show grip
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    // Click the row grip
    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    // Context menu should appear
    const menu = page.locator('.table-grip-menu');
    await expect(menu).toBeVisible();

    // Should have row-specific items
    await expect(menu.locator('button', { hasText: 'Insert row above' })).toBeVisible();
    await expect(menu.locator('button', { hasText: 'Delete row' })).toBeVisible();
  });

  test('clicking column grip opens context menu', async ({ page }) => {
    await createTable(editor, page);

    // Hover body cell to show grip
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    // Click the column grip
    const colGrip = page.locator('.table-col-grip.visible');
    await colGrip.click();
    await page.waitForTimeout(100);

    // Context menu should appear with column items
    const menu = page.locator('.table-grip-menu');
    await expect(menu).toBeVisible();
    await expect(menu.locator('button', { hasText: 'Insert column left' })).toBeVisible();
    await expect(menu.locator('button', { hasText: 'Delete column' })).toBeVisible();
  });

  test('Escape closes context menu', async ({ page }) => {
    await createTable(editor, page);

    // Hover and click grip
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    const menu = page.locator('.table-grip-menu');
    await expect(menu).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    await expect(menu).toHaveCount(0);
  });

  test('clicking outside closes context menu', async ({ page }) => {
    await createTable(editor, page);

    // Open context menu
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    const menu = page.locator('.table-grip-menu');
    await expect(menu).toBeVisible();

    // Click outside
    await page.mouse.click(10, 10);
    await page.waitForTimeout(100);

    await expect(menu).toHaveCount(0);
  });

  test('selection highlight appears when menu opens', async ({ page }) => {
    await createTable(editor, page);

    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    const highlight = page.locator('.table-selection-highlight');
    await expect(highlight).toBeVisible();
  });

  test('grip shows active state when menu is open', async ({ page }) => {
    await createTable(editor, page);

    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    await expect(rowGrip).toHaveClass(/active/);
  });

  test('insert row below adds a row', async ({ page }) => {
    await createTable(editor, page);

    const initialRowCount = await editor.countElements('tr');

    // Open row context menu
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    // Click "Insert row below"
    const menu = page.locator('.table-grip-menu');
    await menu.locator('button', { hasText: 'Insert row below' }).click();
    await page.waitForTimeout(200);

    const newRowCount = await editor.countElements('tr');
    expect(newRowCount).toBe(initialRowCount + 1);
  });

  test('delete row removes a row', async ({ page }) => {
    await createTable(editor, page);

    const initialRowCount = await editor.countElements('tr');

    // Open row context menu on body row
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const rowGrip = page.locator('.table-row-grip.visible');
    await rowGrip.click();
    await page.waitForTimeout(100);

    // Click "Delete row"
    const menu = page.locator('.table-grip-menu');
    await menu.locator('button', { hasText: 'Delete row' }).click();
    await page.waitForTimeout(200);

    const newRowCount = await editor.countElements('tr');
    expect(newRowCount).toBe(initialRowCount - 1);
  });

  test('insert column right adds a column', async ({ page }) => {
    await createTable(editor, page);

    const initialColCount = await editor.countElements('th');

    // Open column context menu
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const colGrip = page.locator('.table-col-grip.visible');
    await colGrip.click();
    await page.waitForTimeout(100);

    const menu = page.locator('.table-grip-menu');
    await menu.locator('button', { hasText: 'Insert column right' }).click();
    await page.waitForTimeout(200);

    const newColCount = await editor.countElements('th');
    expect(newColCount).toBe(initialColCount + 1);
  });

  test('delete column removes a column', async ({ page }) => {
    await createTable(editor, page);

    const initialColCount = await editor.countElements('th');

    // Open column context menu
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:nth-child(1)');
    await cell.hover();
    await page.waitForTimeout(200);

    const colGrip = page.locator('.table-col-grip.visible');
    await colGrip.click();
    await page.waitForTimeout(100);

    const menu = page.locator('.table-grip-menu');
    await menu.locator('button', { hasText: 'Delete column' }).click();
    await page.waitForTimeout(200);

    const newColCount = await editor.countElements('th');
    expect(newColCount).toBe(initialColCount - 1);
  });
});

test.describe('Table Controls - Add Bars', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
    await editor.load();
  });

  test('add-row bar visible when hovering last row', async ({ page }) => {
    await createTable(editor, page);

    // Hover the last row
    const lastRowCell = editor.proseMirror.locator('tr:last-child td:first-child');
    await lastRowCell.hover();
    await page.waitForTimeout(200);

    const addRowBar = page.locator('.table-add-row-bar.visible');
    await expect(addRowBar).toBeVisible();
  });

  test('add-row bar NOT visible when hovering non-last row', async ({ page }) => {
    await createTable(editor, page);

    // Hover a non-last body row (row 2 of a 3-row table)
    const cell = editor.proseMirror.locator('tr:nth-child(2) td:first-child');
    await cell.hover();
    await page.waitForTimeout(200);

    const addRowBar = page.locator('.table-add-row-bar.visible');
    await expect(addRowBar).toHaveCount(0);
  });

  test('add-column bar visible when hovering last column', async ({ page }) => {
    await createTable(editor, page);

    // Hover the last column cell in a body row
    const lastColCell = editor.proseMirror.locator('tr:nth-child(2) td:last-child');
    await lastColCell.hover();
    await page.waitForTimeout(200);

    const addColBar = page.locator('.table-add-column-bar.visible');
    await expect(addColBar).toBeVisible();
  });

  test('clicking add-row bar adds a row', async ({ page }) => {
    await createTable(editor, page);

    const initialRowCount = await editor.countElements('tr');

    // Hover last row to show bar
    const lastRowCell = editor.proseMirror.locator('tr:last-child td:first-child');
    await lastRowCell.hover();
    await page.waitForTimeout(200);

    // Click the add-row bar
    const addRowBar = page.locator('.table-add-row-bar.visible');
    await addRowBar.click();
    await page.waitForTimeout(200);

    const newRowCount = await editor.countElements('tr');
    expect(newRowCount).toBe(initialRowCount + 1);
  });

  test('clicking add-column bar adds a column', async ({ page }) => {
    await createTable(editor, page);

    const initialColCount = await editor.countElements('th');

    // Hover last column to show bar
    const lastColCell = editor.proseMirror.locator('tr:nth-child(2) td:last-child');
    await lastColCell.hover();
    await page.waitForTimeout(200);

    // Click the add-column bar
    const addColBar = page.locator('.table-add-column-bar.visible');
    await addColBar.click();
    await page.waitForTimeout(200);

    const newColCount = await editor.countElements('th');
    expect(newColCount).toBe(initialColCount + 1);
  });
});

test.describe('Table Controls - Column Width Persistence', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('table with colwidths comment applies widths on load', async ({ page }) => {
    const markdown = `<!-- colwidths: 100,200,150 -->\n| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |`;

    await editor.load(markdown);
    await page.waitForTimeout(300);

    // Verify table rendered
    const hasTable = await editor.hasElement('table');
    expect(hasTable).toBe(true);

    // Check that colwidth attributes were applied
    const widths = await editor.proseMirror.evaluate((pm) => {
      const cells = pm.querySelectorAll('th, td');
      return Array.from(cells).map((c) => c.getAttribute('colwidth'));
    });

    // First row (header) cells should have widths
    expect(widths[0]).toBe('100');
    expect(widths[1]).toBe('200');
    expect(widths[2]).toBe('150');
  });

  test('table without colwidths comment loads normally', async ({ page }) => {
    const markdown = `| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |`;

    await editor.load(markdown);
    await page.waitForTimeout(300);

    const hasTable = await editor.hasElement('table');
    expect(hasTable).toBe(true);

    // No colwidth attributes should be set
    const widths = await editor.proseMirror.evaluate((pm) => {
      const cells = pm.querySelectorAll('th');
      return Array.from(cells).map((c) => c.getAttribute('colwidth'));
    });

    // All should be null (no widths)
    widths.forEach((w) => expect(w).toBeNull());
  });

  test('table markdown output includes colwidths when present', async ({ page }) => {
    const markdown = `<!-- colwidths: 100,200,150 -->\n| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |`;

    await editor.load(markdown);
    await page.waitForTimeout(300);

    // Click into a cell to trigger an update
    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();
    await editor.typeWithoutClick(' ');
    await editor.waitForSync();

    const content = await editor.getLastUpdateContent();
    expect(content).toContain('<!-- colwidths:');
  });
});
