/**
 * Mermaid Diagram Tests
 *
 * Tests mermaid diagram functionality:
 * - Rendering mermaid code blocks as diagrams
 * - Toolbar visibility and interaction
 * - View mode toggle (scroll/fit)
 * - Edit mode via code button
 * - Theme support
 * - Keyboard navigation (Enter/ArrowDown after diagram)
 */

import { test, expect } from '@playwright/test';
import { EditorHelper, createEditorHelper } from '../utils/editor-helper';

const SIMPLE_FLOWCHART = `\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\``;

const COMPLEX_FLOWCHART = `\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\``;

const SEQUENCE_DIAGRAM = `\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice
\`\`\``;

test.describe('Mermaid Diagrams', () => {
  let editor: EditorHelper;

  test.beforeEach(async ({ page }) => {
    editor = createEditorHelper(page);
  });

  test.describe('Rendering', () => {
    test('renders mermaid code block as SVG diagram', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      // Should have mermaid node container
      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();

      // Should have rendered SVG in the diagram container (not toolbar icons)
      const diagramSvg = mermaidNode.locator('.mermaid-diagram svg');
      await expect(diagramSvg).toBeVisible();

      // Should NOT show raw mermaid code
      const visibleText = await editor.getVisibleText();
      expect(visibleText).not.toContain('graph TD');
    });

    test('renders complex flowchart with multiple nodes', async ({ page }) => {
      await editor.load(COMPLEX_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();

      // SVG should be in the diagram container
      const diagramSvg = mermaidNode.locator('.mermaid-diagram svg');
      await expect(diagramSvg).toBeVisible();
    });

    test('renders sequence diagram', async ({ page }) => {
      await editor.load(SEQUENCE_DIAGRAM);

      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();

      const diagramSvg = mermaidNode.locator('.mermaid-diagram svg');
      await expect(diagramSvg).toBeVisible();
    });

    test('shows error for invalid mermaid syntax', async ({ page }) => {
      const invalidMermaid = `\`\`\`mermaid
graph INVALID
    ??? --> !!!
\`\`\``;
      await editor.load(invalidMermaid);

      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();

      // Should show error message
      const errorEl = mermaidNode.locator('.mermaid-error');
      await expect(errorEl).toBeVisible();
    });
  });

  test.describe('Toolbar', () => {
    test('toolbar appears on hover', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const toolbar = mermaidNode.locator('.mermaid-toolbar');

      // Toolbar should be hidden initially (opacity 0)
      await expect(toolbar).toHaveCSS('opacity', '0');

      // Hover over the diagram wrapper
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      // Toolbar should become visible
      await expect(toolbar).toHaveCSS('opacity', '1');
    });

    test('toolbar has edit and view toggle buttons', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      // Should have two buttons
      const buttons = mermaidNode.locator('.mermaid-view-toggle');
      await expect(buttons).toHaveCount(2);
    });

    test('clicking diagram does not enter edit mode', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const diagramContainer = mermaidNode.locator('.mermaid-diagram');

      // Click on the diagram
      await diagramContainer.click();

      // Should NOT be in editing mode
      await expect(mermaidNode).not.toHaveClass(/is-editing/);

      // Textarea should NOT be visible
      const textarea = mermaidNode.locator('.mermaid-textarea');
      await expect(textarea).not.toBeVisible();
    });
  });

  test.describe('Edit Mode', () => {
    test('clicking edit button enters edit mode', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');

      // Hover to show toolbar
      await wrapper.hover();

      // Click the edit button (first button)
      const editButton = mermaidNode.locator('.mermaid-view-toggle').first();
      await editButton.click();

      // Should be in editing mode
      await expect(mermaidNode).toHaveClass(/is-editing/);

      // Textarea should be visible
      const textarea = mermaidNode.locator('.mermaid-textarea');
      await expect(textarea).toBeVisible();
    });

    test('textarea contains mermaid code in edit mode', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      const editButton = mermaidNode.locator('.mermaid-view-toggle').first();
      await editButton.click();

      const textarea = mermaidNode.locator('.mermaid-textarea');
      const value = await textarea.inputValue();

      expect(value).toContain('graph TD');
      expect(value).toContain('A[Start]');
    });

    test('Escape exits edit mode without saving', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      const editButton = mermaidNode.locator('.mermaid-view-toggle').first();
      await editButton.click();

      // Modify the textarea
      const textarea = mermaidNode.locator('.mermaid-textarea');
      await textarea.fill('graph TD\n    X[Modified] --> Y[Content]');

      // Press Escape
      await page.keyboard.press('Escape');

      // Should exit edit mode
      await expect(mermaidNode).not.toHaveClass(/is-editing/);

      // Re-enter edit mode to check content was reverted
      await wrapper.hover();
      await editButton.click();
      const value = await textarea.inputValue();
      expect(value).toContain('A[Start]'); // Original content
    });

    test('Cmd/Ctrl+Enter saves and exits edit mode', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      const editButton = mermaidNode.locator('.mermaid-view-toggle').first();
      await editButton.click();

      // Modify the textarea
      const textarea = mermaidNode.locator('.mermaid-textarea');
      await textarea.fill('graph TD\n    X[Modified] --> Y[Content]');

      // Press Cmd/Ctrl+Enter
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+Enter`);

      // Should exit edit mode
      await expect(mermaidNode).not.toHaveClass(/is-editing/);

      // Re-enter edit mode to check content was saved
      await wrapper.hover();
      await editButton.click();
      const value = await textarea.inputValue();
      expect(value).toContain('X[Modified]'); // New content
    });
  });

  test.describe('View Mode Toggle', () => {
    test('clicking view toggle switches between scroll and fit modes', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      const diagramContainer = mermaidNode.locator('.mermaid-diagram');

      // Initially in scroll mode
      await expect(diagramContainer).toHaveClass(/mermaid-scroll-mode/);

      // Hover to show toolbar
      await wrapper.hover();

      // Click the view toggle button (second button)
      const viewToggle = mermaidNode.locator('.mermaid-view-toggle').last();
      await viewToggle.click();

      // Should be in fit mode
      await expect(diagramContainer).toHaveClass(/mermaid-fit-mode/);
      await expect(diagramContainer).not.toHaveClass(/mermaid-scroll-mode/);

      // Click again to toggle back
      await viewToggle.click();

      // Should be back in scroll mode
      await expect(diagramContainer).toHaveClass(/mermaid-scroll-mode/);
      await expect(diagramContainer).not.toHaveClass(/mermaid-fit-mode/);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('Enter after diagram creates new paragraph', async ({ page }) => {
      const content = `# Title

${SIMPLE_FLOWCHART}`;
      await editor.load(content);

      // Click on the mermaid node to select it
      const mermaidNode = page.locator('.mermaid-node');
      await mermaidNode.click();

      // Press Enter
      await page.keyboard.press('Enter');

      // Should have created a new paragraph after the diagram
      // Type some text to verify cursor position
      await page.keyboard.type('New paragraph after diagram');

      await editor.waitForSync();
      const updatedContent = await editor.getLastUpdateContent();
      expect(updatedContent).toContain('New paragraph after diagram');
    });

    test('ArrowDown after diagram moves cursor below', async ({ page }) => {
      const content = `${SIMPLE_FLOWCHART}

Some text below`;
      await editor.load(content);

      // Click on the mermaid node to select it
      const mermaidNode = page.locator('.mermaid-node');
      await mermaidNode.click();

      // Press ArrowDown
      await page.keyboard.press('ArrowDown');

      // Type to verify cursor moved
      await page.keyboard.type('INSERTED ');

      await editor.waitForSync();
      const updatedContent = await editor.getLastUpdateContent();
      expect(updatedContent).toContain('INSERTED Some text below');
    });
  });

  test.describe('Slash Command', () => {
    test('/mermaid inserts a mermaid diagram block', async ({ page }) => {
      await editor.load();

      // Type /mermaid
      await editor.type('/mermaid');

      // Wait for slash menu
      await page.waitForTimeout(100);

      // Press Enter to select
      await page.keyboard.press('Enter');

      // Should have inserted a mermaid node
      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();
    });

    test('/diagram inserts a mermaid diagram block', async ({ page }) => {
      await editor.load();

      // Type /diagram
      await editor.type('/diagram');

      // Wait for slash menu
      await page.waitForTimeout(100);

      // Press Enter to select
      await page.keyboard.press('Enter');

      // Should have inserted a mermaid node
      const mermaidNode = page.locator('.mermaid-node');
      await expect(mermaidNode).toBeVisible();
    });
  });

  test.describe('Markdown Serialization', () => {
    test('mermaid diagram serializes back to markdown code block', async ({ page }) => {
      await editor.load(SIMPLE_FLOWCHART);

      // Make a small edit to trigger update
      const mermaidNode = page.locator('.mermaid-node');
      const wrapper = mermaidNode.locator('.mermaid-diagram-wrapper');
      await wrapper.hover();

      const editButton = mermaidNode.locator('.mermaid-view-toggle').first();
      await editButton.click();

      const textarea = mermaidNode.locator('.mermaid-textarea');
      await textarea.fill('graph TD\n    A[Start] --> B[Middle] --> C[End]');

      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+Enter`);

      await editor.waitForSync();
      const content = await editor.getLastUpdateContent();

      // Should serialize as mermaid code block
      expect(content).toContain('```mermaid');
      expect(content).toContain('graph TD');
      expect(content).toContain('A[Start]');
      expect(content).toContain('B[Middle]');
      expect(content).toContain('C[End]');
      expect(content).toContain('```');
    });
  });
});
