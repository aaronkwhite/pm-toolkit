/**
 * List Tests
 *
 * Tests list functionality:
 * - Bullet list creation
 * - Numbered list increments
 * - Task list checkbox behavior
 * - Task list alignment
 * - Nested lists
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Lists', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test('bullet list renders correctly', async ({ page }) => {
    const content = `- Item 1
- Item 2
- Item 3`;
    await editor.load(content);

    // Should have ul element
    const hasUl = await editor.hasElement('ul');
    expect(hasUl).toBe(true);

    // Should have 3 list items
    const liCount = await editor.countElements('ul > li');
    expect(liCount).toBe(3);

    // Visible text should contain items
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Item 1');
    expect(visibleText).toContain('Item 2');
    expect(visibleText).toContain('Item 3');
  });

  test('numbered list renders with correct numbers', async ({ page }) => {
    const content = `1. First
2. Second
3. Third`;
    await editor.load(content);

    // Should have ol element
    const hasOl = await editor.hasElement('ol');
    expect(hasOl).toBe(true);

    // Should have 3 list items
    const liCount = await editor.countElements('ol > li');
    expect(liCount).toBe(3);

    // Visible text should contain items
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('First');
    expect(visibleText).toContain('Second');
    expect(visibleText).toContain('Third');
  });

  test('task list renders with checkboxes', async ({ page }) => {
    const content = `- [ ] Unchecked task
- [x] Checked task`;
    await editor.load(content);

    // Should have task list
    const hasTaskList = await editor.hasElement('ul[data-type="taskList"]');
    expect(hasTaskList).toBe(true);

    // Should have checkboxes
    const checkboxCount = await editor.countElements('ul[data-type="taskList"] input[type="checkbox"]');
    expect(checkboxCount).toBe(2);

    // Check initial states
    const states = await editor.getTaskCheckboxStates();
    expect(states[0]).toBe(false); // Unchecked
    expect(states[1]).toBe(true);  // Checked
  });

  test('task list checkbox is clickable', async ({ page }) => {
    const content = `- [ ] Click me`;
    await editor.load(content);

    // Get initial state
    let states = await editor.getTaskCheckboxStates();
    expect(states[0]).toBe(false);

    // Click the checkbox
    await editor.checkTaskItem(0);
    await editor.waitForSync();

    // Should now be checked
    states = await editor.getTaskCheckboxStates();
    expect(states[0]).toBe(true);

    // Click again to uncheck
    await editor.checkTaskItem(0);
    await editor.waitForSync();

    // Should now be unchecked
    states = await editor.getTaskCheckboxStates();
    expect(states[0]).toBe(false);
  });

  test('task list checkbox and text are aligned', async ({ page }) => {
    const content = `- [ ] Task item text`;
    await editor.load(content);

    // Get the task item
    const taskItem = editor.proseMirror.locator('ul[data-type="taskList"] > li').first();
    const checkbox = taskItem.locator('input[type="checkbox"]');
    const textContent = taskItem.locator('div');

    // Both should be visible
    await expect(checkbox).toBeVisible();
    await expect(textContent).toBeVisible();

    // Get bounding boxes to check alignment
    const checkboxBox = await checkbox.boundingBox();
    const textBox = await textContent.boundingBox();

    if (checkboxBox && textBox) {
      // Vertical centers should be close (within 10px for reasonable alignment)
      const checkboxCenter = checkboxBox.y + checkboxBox.height / 2;
      const textCenter = textBox.y + textBox.height / 2;
      const verticalDiff = Math.abs(checkboxCenter - textCenter);
      expect(verticalDiff).toBeLessThan(10);
    }
  });

  test('nested bullet lists work', async ({ page }) => {
    const content = `- Parent
  - Child 1
  - Child 2
- Another parent`;
    await editor.load(content);

    // Should have nested ul
    const hasNestedUl = await editor.hasElement('ul ul');
    expect(hasNestedUl).toBe(true);

    // Visible text should contain all items
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Parent');
    expect(visibleText).toContain('Child 1');
    expect(visibleText).toContain('Child 2');
    expect(visibleText).toContain('Another parent');
  });

  test('nested numbered lists work', async ({ page }) => {
    const content = `1. Parent
   1. Child 1
   2. Child 2
2. Another parent`;
    await editor.load(content);

    // Should have nested ol
    const hasNestedOl = await editor.hasElement('ol ol');
    expect(hasNestedOl).toBe(true);
  });

  test('mixed nested lists work', async ({ page }) => {
    const content = `1. Numbered
   - Bullet child
   - Another bullet
2. More numbered`;
    await editor.load(content);

    // Should have ol with nested ul
    const hasOl = await editor.hasElement('ol');
    expect(hasOl).toBe(true);

    const hasUl = await editor.hasElement('ul');
    expect(hasUl).toBe(true);
  });

  test('typing in list continues the list', async ({ page }) => {
    await editor.load('- First item');

    // Click at end of first item
    await editor.focus();
    await editor.pressKey('End');

    // Press Enter to create new item
    await editor.pressKey('Enter');

    // Type second item
    await editor.type('Second item');
    await editor.waitForSync();

    // Should have 2 list items
    const liCount = await editor.countElements('ul > li');
    expect(liCount).toBe(2);

    // Both items should be present
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('First item');
    expect(visibleText).toContain('Second item');
  });

  test('empty list item converts to paragraph on Enter', async ({ page }) => {
    await editor.load('- Item');

    // Go to end and create new empty item
    await editor.focus();
    await editor.pressKey('End');
    await editor.pressKey('Enter');

    // Press Enter again on empty item - should exit list
    await editor.pressKey('Enter');
    await editor.waitForSync();

    // Type regular text
    await editor.type('Regular paragraph');
    await editor.waitForSync();

    // Should have both list and paragraph
    const visibleText = await editor.getVisibleText();
    expect(visibleText).toContain('Item');
    expect(visibleText).toContain('Regular paragraph');
  });

  test('Tab indents list item', async ({ page }) => {
    const content = `- Parent
- Child candidate`;
    await editor.load(content);

    // Click on second item and wait for focus
    const items = editor.proseMirror.locator('ul > li');
    await items.nth(1).click();
    await page.waitForTimeout(100); // Ensure click is processed

    // Press Tab to indent
    await editor.pressKey('Tab');
    await editor.waitForSync();

    // Should now have nested list
    const hasNestedUl = await editor.hasElement('ul ul');
    expect(hasNestedUl).toBe(true);
  });

  test('Shift+Tab outdents list item', async ({ page }) => {
    const content = `- Parent
  - Nested child`;
    await editor.load(content);

    // Click on nested item
    const nestedItem = editor.proseMirror.locator('ul ul li');
    await nestedItem.click();

    // Press Shift+Tab to outdent
    await editor.pressKey('Shift+Tab');
    await editor.waitForSync();

    // Should have 2 top-level items now
    const topLevelItems = await editor.countElements('ul:not(ul ul) > li');
    expect(topLevelItems).toBeGreaterThanOrEqual(2);
  });

  test('completed task item has strikethrough', async ({ page }) => {
    const content = `- [x] Completed task`;
    await editor.load(content);

    // The task item should have data-checked attribute
    const checkedItem = editor.proseMirror.locator('li[data-checked="true"]');
    await expect(checkedItem).toBeVisible();

    // The content should have reduced opacity (styling)
    const textDiv = checkedItem.locator('div');
    const hasStrikethrough = await textDiv.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.textDecoration.includes('line-through') ||
             parseFloat(style.opacity) < 1;
    });
    expect(hasStrikethrough).toBe(true);
  });

  test('task list generates correct markdown', async ({ page }) => {
    await editor.load('- [ ] Unchecked');

    // Check the checkbox
    await editor.checkTaskItem(0);
    await editor.waitForSync();

    // Get the generated markdown
    const content = await editor.getLastUpdateContent();
    expect(content).toContain('[x]');
  });

  test('bullet list generates correct markdown', async ({ page }) => {
    await editor.load();

    // Type a bullet list
    await editor.type('- First');
    await editor.pressKey('Enter');
    await editor.type('Second');
    await editor.waitForSync();

    // Get the generated markdown
    const content = await editor.getLastUpdateContent();
    expect(content).toContain('- First');
    expect(content).toContain('- Second');
  });
});
