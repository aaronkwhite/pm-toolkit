/**
 * Table Tests
 *
 * Tests table functionality:
 * - Tables render with borders
 * - Table cells are editable
 * - Tab moves between cells
 *
 * NOTE: Table cell editing via Playwright requires specific focus patterns that
 * vary across Tiptap versions. Structural tests pass; editing tests are marked
 * as fixme for future investigation.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Tables', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('table created via slash command has correct structure', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create table via slash command
    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Should have table element
    const hasTable = await editor.hasElement('table');
    expect(hasTable).toBe(true);

    // Should have header row (th elements)
    const thCount = await editor.countElements('th');
    expect(thCount).toBe(3); // Default 3x3 table

    // Should have data cells
    const tdCount = await editor.countElements('td');
    expect(tdCount).toBe(6); // 2 data rows * 3 columns
  });

  test('table is styled correctly', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Table should exist
    const hasTable = await editor.hasElement('table');
    expect(hasTable).toBe(true);

    // Table should have borders (verify CSS is applied)
    const table = editor.proseMirror.locator('table').first();
    const hasBorder = await table.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.borderCollapse === 'collapse';
    });
    expect(hasBorder).toBe(true);
  });

  test('table header row uses th elements', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // First row should have th elements
    const firstRowTh = await editor.countElements('tr:first-child th');
    expect(firstRowTh).toBe(3);

    // First row should NOT have td elements
    const firstRowTd = await editor.countElements('tr:first-child td');
    expect(firstRowTd).toBe(0);
  });

  test('table has correct row count', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Default table should have 3 rows (1 header + 2 data)
    const rowCount = await editor.countElements('tr');
    expect(rowCount).toBe(3);
  });

  // KNOWN ISSUE: Clicking into table cells requires special handling in Tiptap
  // The following tests document expected behavior but may need adjustment
  // based on the specific Tiptap table extension configuration.

  test('table cells are editable', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Click into the first header cell
    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();
    await page.waitForTimeout(50);

    // Type content in first cell (without clicking to preserve cell focus)
    await editor.typeWithoutClick('First Cell');
    await editor.waitForSync();

    // Verify the content in first header
    const text = await firstHeader.innerText();
    expect(text.trim()).toBe('First Cell');
  });

  test('Tab moves between cells', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();

    // Type in first cell (without click to preserve focus)
    await editor.typeWithoutClick('A');

    // Tab to next cell
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('B');

    // Tab again
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('C');
    await editor.waitForSync();

    // Verify all headers have content
    const headers = editor.proseMirror.locator('th');
    expect((await headers.nth(0).innerText()).trim()).toBe('A');
    expect((await headers.nth(1).innerText()).trim()).toBe('B');
    expect((await headers.nth(2).innerText()).trim()).toBe('C');
  });

  test('Shift+Tab moves to previous cell', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();

    // Type in first cell (without click to preserve focus)
    await editor.typeWithoutClick('A');

    // Tab twice to third cell
    await editor.pressKey('Tab');
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('C');

    // Shift+Tab to go back to second cell
    await editor.pressKey('Shift+Tab');
    await editor.typeWithoutClick('B');
    await editor.waitForSync();

    // Verify headers
    const headers = editor.proseMirror.locator('th');
    expect((await headers.nth(0).innerText()).trim()).toBe('A');
    expect((await headers.nth(1).innerText()).trim()).toBe('B');
    expect((await headers.nth(2).innerText()).trim()).toBe('C');
  });

  test('Tab at end of header row moves to first data row', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();

    // Fill all header cells (without click to preserve focus)
    await editor.typeWithoutClick('H1');
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('H2');
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('H3');

    // Tab should move to first data cell
    await editor.pressKey('Tab');
    await editor.typeWithoutClick('D1');
    await editor.waitForSync();

    // Verify data cell has content
    const firstDataCell = editor.proseMirror.locator('td').first();
    expect((await firstDataCell.innerText()).trim()).toBe('D1');
  });

  test('table generates markdown with pipes', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    const firstHeader = editor.proseMirror.locator('th').first();
    await firstHeader.click();

    // Add some content (without click to preserve focus)
    await editor.typeWithoutClick('Test');
    await editor.waitForSync();

    // Get generated markdown
    const markdown = await editor.getLastUpdateContent();

    // Should contain table markdown syntax
    expect(markdown).toContain('|');
    expect(markdown).toContain('Test');
  });

  test('can edit data cells', async ({ page }) => {
    await editor.load();
    await editor.focus();

    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Click on first data cell
    const firstDataCell = editor.proseMirror.locator('td').first();
    await firstDataCell.click();

    // Type content (without click to preserve cell focus)
    await editor.typeWithoutClick('Data Value');
    await editor.waitForSync();

    // Verify first data cell content
    expect((await firstDataCell.innerText()).trim()).toBe('Data Value');
  });

  test('multiple tables can exist', async ({ page }) => {
    await editor.load();
    await editor.focus();

    // Create first table
    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Click below the table to position cursor outside
    await editor.proseMirror.click({ position: { x: 100, y: 300 } });
    await page.waitForTimeout(100);

    // Create second table
    await editor.type('/table');
    await page.waitForTimeout(100);
    await editor.pressKey('Enter');
    await page.waitForTimeout(200);

    // Should have 2 tables
    const tableCount = await editor.countElements('table');
    expect(tableCount).toBe(2);
  });
});
