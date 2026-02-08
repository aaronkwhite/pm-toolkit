/**
 * Save Guard Tests
 *
 * Verifies that the validateMarkdown guard prevents corrupted content
 * (webview URIs, internal data attributes, excessive HTML) from being
 * sent to the extension as an 'update' message — which would overwrite
 * the .md file on disk.
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

test.describe('Save Guard', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  // --- validator unit tests (run inside the webview) ---

  test('validateMarkdown rejects webview-internal URIs', async ({ page }) => {
    await editor.load();
    const result = await page.evaluate(() => {
      return (window as any).__validateMarkdown(
        '# Doc\n\n![img](https://file+.vscode-resource.vscode-cdn.net/path/to/img.png)'
      );
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('webview-internal');
  });

  test('validateMarkdown rejects data-original-src attributes', async ({ page }) => {
    await editor.load();
    const result = await page.evaluate(() => {
      return (window as any).__validateMarkdown(
        '# Doc\n\n<img src="./img.png" data-original-src="./images/foo.png">'
      );
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('internal data attributes');
  });

  test('validateMarkdown rejects content with excessive HTML ratio', async ({ page }) => {
    await editor.load();
    // Build content that is >40% HTML tags by character count
    const heavyHtml =
      '<table><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>'.repeat(5);
    const result = await page.evaluate((html) => {
      return (window as any).__validateMarkdown(html);
    }, heavyHtml);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('HTML ratio too high');
  });

  test('validateMarkdown allows clean markdown', async ({ page }) => {
    await editor.load();
    const result = await page.evaluate(() => {
      return (window as any).__validateMarkdown(
        '# Hello\n\nSome paragraph with **bold** and *italic*.\n\n- item 1\n- item 2'
      );
    });
    expect(result.valid).toBe(true);
  });

  test('validateMarkdown allows legitimate inline HTML (details/summary)', async ({ page }) => {
    await editor.load();
    const content = [
      '# FAQ',
      '',
      'Some introductory paragraph explaining the FAQ section.',
      '',
      '<details>',
      '<summary>How do I install?</summary>',
      '',
      'Run `npm install` in the project root.',
      '',
      '</details>',
      '',
      'More markdown text after the details block to keep the ratio low.',
      '',
      '## Another section',
      '',
      'Plenty of markdown text here to ensure the HTML-to-text ratio stays well under 40%.',
    ].join('\n');
    const result = await page.evaluate((c) => {
      return (window as any).__validateMarkdown(c);
    }, content);
    expect(result.valid).toBe(true);
  });

  test('validateMarkdown allows markdown with a small HTML table', async ({ page }) => {
    await editor.load();
    const content = [
      '# Report',
      '',
      'This is a long markdown document with lots of text content.',
      'It has multiple paragraphs to ensure the HTML ratio stays under 40%.',
      '',
      '## Data',
      '',
      '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table>',
      '',
      '## Conclusion',
      '',
      'The results show that everything is working correctly.',
      'We should continue to monitor these metrics over time.',
    ].join('\n');
    const result = await page.evaluate((c) => {
      return (window as any).__validateMarkdown(c);
    }, content);
    expect(result.valid).toBe(true);
  });

  // --- integration tests (full editor save flow) ---

  test('normal content saves normally', async ({ page }) => {
    await editor.load('# Existing doc');
    await editor.clearMessages();

    await editor.type(' edited');
    await editor.waitForSync();

    const updates = await editor.getMessages('update');
    expect(updates.length).toBeGreaterThan(0);
    const last = updates[updates.length - 1] as any;
    expect(last.payload.content).toContain('edited');
  });

  test('blocks save when editor produces webview URIs', async ({ page }) => {
    await editor.load('# Normal document');
    await editor.clearMessages();

    // Directly set corrupted HTML content via the editor instance
    await page.evaluate(() => {
      const pm = document.querySelector('.ProseMirror') as any;
      const tiptap = pm?.pmViewDesc?.view?.state
        ? { commands: (window as any)._tiptapEditor?.commands }
        : null;

      // Fallback: use _getEditorContent's editor reference
      // We'll use setContent on the React editor exposed through the
      // tiptap-markdown storage path
      const editorEl = document.querySelector('.tiptap') || document.querySelector('.ProseMirror');
      if (editorEl) {
        // Trigger an input that will produce markdown with a vscode-resource URI
        // Simulating what happens when ImageNode's originalSrc is lost
        editorEl.innerHTML =
          '<p>Some text</p><img src="https://file+.vscode-resource.vscode-cdn.net/path/img.png">';
        editorEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Wait for debounce
    await editor.waitForSync();
    await page.waitForTimeout(200);

    // No update messages should have been sent (content was blocked)
    const updates = await editor.getMessages('update');
    // The corrupted content should NOT have produced an update
    const corrupted = (updates as any[]).filter(
      (u) =>
        u.payload?.content?.includes('vscode-resource') ||
        u.payload?.content?.includes('vscode-cdn')
    );
    expect(corrupted).toHaveLength(0);
  });
});
