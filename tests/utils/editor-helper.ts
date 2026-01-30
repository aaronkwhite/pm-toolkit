/**
 * Editor Helper - Page Object Pattern
 *
 * Provides a clean API for interacting with the Tiptap editor in Playwright tests.
 */

import { Page, Locator, expect } from '@playwright/test';

// Debounce time used by the editor (plus buffer)
const DEBOUNCE_MS = 150;
const DEBOUNCE_BUFFER = 50;

/**
 * Helper class for interacting with the PM Toolkit editor
 */
export class EditorHelper {
  readonly page: Page;
  readonly editorContainer: Locator;
  readonly proseMirror: Locator;
  readonly slashMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.editorContainer = page.locator('#editor');
    this.proseMirror = page.locator('.ProseMirror');
    this.slashMenu = page.locator('.slash-command-menu');
  }

  /**
   * Navigate to the editor and wait for it to be ready
   */
  async load(initialContent?: string): Promise<void> {
    await this.page.goto('/');

    // Wait for the editor to initialize
    await this.proseMirror.waitFor({ state: 'visible' });

    // Wait for the 'ready' message to be sent
    await this.page.waitForFunction(() => {
      return window._vscodeMessages?.some((m: any) => m.type === 'ready');
    }, { timeout: 5000 });

    // If initial content is provided, simulate the init message from extension
    if (initialContent !== undefined) {
      await this.simulateInit(initialContent);
    }

    // Clear messages after loading so tests start fresh
    await this.clearMessages();
  }

  /**
   * Simulate the 'init' message from the extension
   */
  async simulateInit(content: string, filename: string = 'test.md'): Promise<void> {
    await this.page.evaluate(
      ({ content, filename }) => {
        window._simulateMessage({
          type: 'init',
          payload: { content, filename },
        });
      },
      { content, filename }
    );

    // Wait for content to be rendered
    await this.page.waitForTimeout(100);
  }

  /**
   * Simulate an 'update' message from the extension (external change)
   */
  async simulateExternalUpdate(content: string): Promise<void> {
    await this.page.evaluate((content) => {
      window._simulateMessage({
        type: 'update',
        payload: { content },
      });
    }, content);

    // Wait for content to be rendered
    await this.page.waitForTimeout(100);
  }

  /**
   * Get the current markdown content from the editor
   */
  async getContent(): Promise<string> {
    // Type in the editor to trigger an update message if needed
    // Then read the last update message
    const messages = await this.getMessages('update');
    if (messages.length > 0) {
      return (messages[messages.length - 1] as any).payload.content;
    }

    // If no update messages yet, we need to get content another way
    // Force an update by focusing and typing/deleting
    return '';
  }

  /**
   * Get the visible text content (not markdown)
   */
  async getVisibleText(): Promise<string> {
    return this.proseMirror.innerText();
  }

  /**
   * Type text at the current cursor position (clicks to focus first)
   */
  async type(text: string): Promise<void> {
    await this.proseMirror.click();
    await this.page.keyboard.type(text);
  }

  /**
   * Type text without clicking (preserves current cursor position)
   * Use this after positioning cursor with arrow keys, Home/End, etc.
   */
  async typeWithoutClick(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  /**
   * Press a keyboard key or shortcut
   */
  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  /**
   * Undo the last action (Cmd+Z / Ctrl+Z)
   */
  async undo(): Promise<void> {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+z`);
  }

  /**
   * Redo the last undone action (Cmd+Shift+Z / Ctrl+Shift+Z)
   */
  async redo(): Promise<void> {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+Shift+z`);
  }

  /**
   * Toggle bold formatting (Cmd+B / Ctrl+B)
   */
  async toggleBold(): Promise<void> {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+b`);
  }

  /**
   * Toggle italic formatting (Cmd+I / Ctrl+I)
   */
  async toggleItalic(): Promise<void> {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+i`);
  }

  /**
   * Select all content (Cmd+A / Ctrl+A)
   */
  async selectAll(): Promise<void> {
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+a`);
  }

  /**
   * Click at the beginning of a specific line
   */
  async clickAtLine(lineNumber: number): Promise<void> {
    // Get all paragraph/block elements
    const blocks = this.proseMirror.locator('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
    const count = await blocks.count();

    if (lineNumber > 0 && lineNumber <= count) {
      await blocks.nth(lineNumber - 1).click();
    }
  }

  /**
   * Wait for the debounce to complete and sync to happen
   */
  async waitForSync(): Promise<void> {
    await this.page.waitForTimeout(DEBOUNCE_MS + DEBOUNCE_BUFFER);
  }

  /**
   * Wait for an update message to be sent
   */
  async waitForUpdate(timeout: number = 5000): Promise<unknown> {
    return this.page.evaluate((timeout) => {
      return window._waitForMessage('update', timeout);
    }, timeout);
  }

  /**
   * Get all captured postMessage calls
   */
  async getMessages(type?: string): Promise<unknown[]> {
    if (type) {
      return this.page.evaluate((type) => window._getMessagesByType(type), type);
    }
    return this.page.evaluate(() => window._getMessages());
  }

  /**
   * Clear all captured messages
   */
  async clearMessages(): Promise<void> {
    await this.page.evaluate(() => window._clearMessages());
  }

  /**
   * Get the last update message content
   */
  async getLastUpdateContent(): Promise<string | null> {
    const messages = await this.getMessages('update') as Array<{ payload: { content: string } }>;
    if (messages.length > 0) {
      return messages[messages.length - 1].payload.content;
    }
    return null;
  }

  /**
   * Focus the editor
   */
  async focus(): Promise<void> {
    await this.proseMirror.click();
  }

  /**
   * Check if the editor is focused
   */
  async isFocused(): Promise<boolean> {
    return this.proseMirror.evaluate((el) => el.classList.contains('ProseMirror-focused'));
  }

  /**
   * Check if the slash command menu is visible
   */
  async isSlashMenuVisible(): Promise<boolean> {
    const display = await this.slashMenu.evaluate((el) =>
      window.getComputedStyle(el).display
    ).catch(() => 'none');
    return display !== 'none';
  }

  /**
   * Get visible slash menu items
   */
  async getSlashMenuItems(): Promise<string[]> {
    const items = this.slashMenu.locator('.slash-command-item .slash-command-title');
    return items.allTextContents();
  }

  /**
   * Get the currently selected slash menu item
   */
  async getSelectedSlashMenuItem(): Promise<string | null> {
    const selected = this.slashMenu.locator('.slash-command-item.is-selected .slash-command-title');
    const count = await selected.count();
    if (count > 0) {
      return selected.textContent();
    }
    return null;
  }

  /**
   * Check if the placeholder is visible
   */
  async isPlaceholderVisible(): Promise<boolean> {
    const placeholder = this.proseMirror.locator('p.is-editor-empty');
    const count = await placeholder.count();
    return count > 0;
  }

  /**
   * Get the placeholder text
   */
  async getPlaceholderText(): Promise<string | null> {
    const placeholder = this.proseMirror.locator('p.is-editor-empty');
    const count = await placeholder.count();
    if (count > 0) {
      return placeholder.evaluate((el) =>
        window.getComputedStyle(el, '::before').content.replace(/['"]/g, '')
      );
    }
    return null;
  }

  /**
   * Check if content contains specific HTML structure
   */
  async hasElement(selector: string): Promise<boolean> {
    const count = await this.proseMirror.locator(selector).count();
    return count > 0;
  }

  /**
   * Get count of elements matching selector
   */
  async countElements(selector: string): Promise<number> {
    return this.proseMirror.locator(selector).count();
  }

  /**
   * Get the text of a specific element
   */
  async getElementText(selector: string): Promise<string> {
    return this.proseMirror.locator(selector).first().innerText();
  }

  /**
   * Check a task list checkbox
   */
  async checkTaskItem(index: number = 0): Promise<void> {
    const checkbox = this.proseMirror.locator('ul[data-type="taskList"] input[type="checkbox"]').nth(index);
    await checkbox.click();
  }

  /**
   * Get task list checkbox states
   */
  async getTaskCheckboxStates(): Promise<boolean[]> {
    const checkboxes = this.proseMirror.locator('ul[data-type="taskList"] input[type="checkbox"]');
    const count = await checkboxes.count();
    const states: boolean[] = [];
    for (let i = 0; i < count; i++) {
      states.push(await checkboxes.nth(i).isChecked());
    }
    return states;
  }

  /**
   * Click on a table cell
   */
  async clickTableCell(row: number, col: number): Promise<void> {
    const cell = this.proseMirror.locator(`tr:nth-child(${row}) td:nth-child(${col}), tr:nth-child(${row}) th:nth-child(${col})`);
    await cell.click();
  }

  /**
   * Get table cell content
   */
  async getTableCellContent(row: number, col: number): Promise<string> {
    const cell = this.proseMirror.locator(`tr:nth-child(${row}) td:nth-child(${col}), tr:nth-child(${row}) th:nth-child(${col})`);
    return cell.innerText();
  }
}

/**
 * Create an EditorHelper instance for a page
 */
export function createEditorHelper(page: Page): EditorHelper {
  return new EditorHelper(page);
}
