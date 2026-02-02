/**
 * Settings Panel E2E Tests
 *
 * Tests for the PM Toolkit settings panel UI and interactions.
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3333/settings';

test.describe('Settings Panel', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto(BASE_URL);
    // Clear any previous messages
    await page.evaluate(() => window._clearMessages());
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Layout and Content', () => {
    test('displays page title and tagline', async () => {
      const title = page.locator('.page-title');
      const tagline = page.locator('.page-tagline');

      await expect(title).toHaveText('PM Toolkit');
      await expect(tagline).toContainText('Notion-like editing');
    });

    test('displays all section labels', async () => {
      const sections = page.locator('.section-label');
      await expect(sections).toHaveCount(4);

      await expect(sections.nth(0)).toHaveText('Editor');
      await expect(sections.nth(1)).toHaveText('Templates');
      await expect(sections.nth(2)).toHaveText('Kanban');
      await expect(sections.nth(3)).toHaveText('Support the Project');
    });

    test('displays version footer', async () => {
      const footer = page.locator('.version-footer');
      await expect(footer).toContainText('PM Toolkit v');
    });

    test('displays Buy Me a Coffee link', async () => {
      const coffeeLink = page.locator('#coffeeLink');
      await expect(coffeeLink).toBeVisible();

      const img = coffeeLink.locator('img');
      await expect(img).toHaveAttribute('alt', 'Buy Me A Coffee');
    });
  });

  test.describe('Editor Settings', () => {
    test('font size input has correct default value', async () => {
      const input = page.locator('#editorFontSize');
      await expect(input).toHaveValue('14');
    });

    test('font size input has correct min/max attributes', async () => {
      const input = page.locator('#editorFontSize');
      await expect(input).toHaveAttribute('min', '10');
      await expect(input).toHaveAttribute('max', '24');
    });

    test('changing font size sends message', async () => {
      const input = page.locator('#editorFontSize');
      await input.fill('16');
      await input.dispatchEvent('change');

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'updateSetting',
        key: 'editorFontSize',
        value: 16
      });
    });
  });

  test.describe('Template Settings', () => {
    test('template folder shows "Not set" by default', async () => {
      const folderPath = page.locator('#folderPath');
      await expect(folderPath).toHaveText('Not set');
      await expect(folderPath).toHaveClass(/empty/);
    });

    test('browse button is visible', async () => {
      const browseBtn = page.locator('#browseBtn');
      await expect(browseBtn).toBeVisible();
      await expect(browseBtn).toHaveText('Browse');
    });

    test('clicking browse sends message', async () => {
      const browseBtn = page.locator('#browseBtn');
      await browseBtn.click();

      const messages = await page.evaluate(() => window._getMessagesByType('browseFolder'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ type: 'browseFolder' });
    });

    test('watch toggle is checked by default', async () => {
      const toggle = page.locator('#watchEnabled');
      await expect(toggle).toBeChecked();
    });

    test('toggling watch sends message', async () => {
      // Click the toggle slider (visible element) instead of hidden checkbox
      const slider = page.locator('#watchEnabled + .toggle-slider');
      await slider.click();

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'updateSetting',
        key: 'templateWatchEnabled',
        value: false
      });
    });
  });

  test.describe('Kanban Settings', () => {
    test('default columns has correct value', async () => {
      const input = page.locator('#kanbanDefaultColumns');
      await expect(input).toHaveValue('Backlog, In Progress, Done');
    });

    test('changing default columns sends message', async () => {
      const input = page.locator('#kanbanDefaultColumns');
      await input.fill('To Do, Doing, Done');
      await input.dispatchEvent('change');

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'updateSetting',
        key: 'kanbanDefaultColumns',
        value: 'To Do, Doing, Done'
      });
    });

    test('show thumbnails toggle is checked by default', async () => {
      const toggle = page.locator('#kanbanShowThumbnails');
      await expect(toggle).toBeChecked();
    });

    test('toggling thumbnails sends message', async () => {
      // Click the toggle slider (visible element) instead of hidden checkbox
      const slider = page.locator('#kanbanShowThumbnails + .toggle-slider');
      await slider.click();

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'updateSetting',
        key: 'kanbanShowThumbnails',
        value: false
      });
    });

    test('save delay has correct default value', async () => {
      const input = page.locator('#kanbanSaveDelay');
      await expect(input).toHaveValue('150');
    });

    test('save delay has correct min/max/step', async () => {
      const input = page.locator('#kanbanSaveDelay');
      await expect(input).toHaveAttribute('min', '50');
      await expect(input).toHaveAttribute('max', '2000');
      await expect(input).toHaveAttribute('step', '50');
    });

    test('changing save delay sends message', async () => {
      const input = page.locator('#kanbanSaveDelay');
      await input.fill('300');
      await input.dispatchEvent('change');

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'updateSetting',
        key: 'kanbanSaveDelay',
        value: 300
      });
    });
  });

  test.describe('Support Section', () => {
    test('clicking coffee link sends openExternal message', async () => {
      const coffeeLink = page.locator('#coffeeLink');
      await coffeeLink.click();

      const messages = await page.evaluate(() => window._getMessagesByType('openExternal'));
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        type: 'openExternal',
        url: 'https://buymeacoffee.com/aaronkwhite'
      });
    });
  });

  test.describe('Input Validation', () => {
    test('font size outside range does not send message', async () => {
      const input = page.locator('#editorFontSize');

      // Try value below min
      await input.fill('5');
      await input.dispatchEvent('change');

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(0);
    });

    test('save delay outside range does not send message', async () => {
      const input = page.locator('#kanbanSaveDelay');

      // Try value below min
      await input.fill('10');
      await input.dispatchEvent('change');

      const messages = await page.evaluate(() => window._getMessagesByType('updateSetting'));
      expect(messages).toHaveLength(0);
    });
  });
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    _clearMessages: () => void;
    _getMessages: () => Array<{ type: string; [key: string]: unknown }>;
    _getMessagesByType: (type: string) => Array<{ type: string; [key: string]: unknown }>;
  }
}
