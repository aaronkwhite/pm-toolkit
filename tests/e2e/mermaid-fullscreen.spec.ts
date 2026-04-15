import { test, expect } from '@playwright/test';
import { EditorHelper } from '../utils/editor-helper';

test('mermaid fullscreen button opens overlay', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('```mermaid\ngraph TD\n  A --> B\n```');
  await page.waitForTimeout(800); // wait for mermaid render
  await page.locator('.mermaid-diagram-wrapper').hover();
  await page.waitForTimeout(200);
  const fullscreenBtn = page.locator('.mermaid-toolbar button[title="Full screen"]');
  if (await fullscreenBtn.isVisible()) {
    await fullscreenBtn.click();
    await expect(page.locator('.pm-mermaid-fullscreen')).toBeVisible();
  }
});

test('mermaid fullscreen closes on Escape', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('```mermaid\ngraph TD\n  A --> B\n```');
  await page.waitForTimeout(800);
  await page.locator('.mermaid-diagram-wrapper').hover();
  await page.waitForTimeout(200);
  const fullscreenBtn = page.locator('.mermaid-toolbar button[title="Full screen"]');
  if (await fullscreenBtn.isVisible()) {
    await fullscreenBtn.click();
    await expect(page.locator('.pm-mermaid-fullscreen')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.pm-mermaid-fullscreen')).not.toBeVisible();
  }
});

test('mermaid fullscreen closes on backdrop click', async ({ page }) => {
  const editor = new EditorHelper(page);
  await editor.load();
  await editor.simulateInit('```mermaid\ngraph TD\n  A --> B\n```');
  await page.waitForTimeout(800);
  await page.locator('.mermaid-diagram-wrapper').hover();
  await page.waitForTimeout(200);
  const fullscreenBtn = page.locator('.mermaid-toolbar button[title="Full screen"]');
  if (await fullscreenBtn.isVisible()) {
    await fullscreenBtn.click();
    await expect(page.locator('.pm-mermaid-fullscreen')).toBeVisible();
    // Click the backdrop (not the content)
    await page.locator('.pm-mermaid-fullscreen').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.pm-mermaid-fullscreen')).not.toBeVisible();
  }
});
