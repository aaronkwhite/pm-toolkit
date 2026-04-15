import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Self-contained CSS for exported HTML documents.
 * Handles body typography, headings, inline code, code blocks,
 * blockquotes, tables, images, links, checkboxes, and centered layout.
 */
const HTML_CSS = `
  *, *::before, *::after {
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    color: #1e1e1e;
    background: #ffffff;
    margin: 0;
    padding: 40px 20px;
  }

  .content {
    max-width: 800px;
    margin: 0 auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    color: #111827;
  }

  h1 {
    font-size: 2em;
    padding-bottom: 0.3em;
    border-bottom: 2px solid #e5e7eb;
  }

  h2 {
    font-size: 1.5em;
    padding-bottom: 0.2em;
    border-bottom: 1px solid #e5e7eb;
  }

  h3 { font-size: 1.25em; }
  h4 { font-size: 1.1em; }
  h5 { font-size: 1em; }
  h6 { font-size: 0.9em; color: #6b7280; }

  p {
    margin-top: 0;
    margin-bottom: 1em;
  }

  a {
    color: #0969da;
    text-decoration: underline;
  }

  a:hover {
    color: #0550ae;
  }

  code {
    font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace;
    font-size: 0.875em;
    background: #f3f4f6;
    color: #1e1e1e;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
  }

  pre {
    font-family: 'SF Mono', Monaco, Menlo, Consolas, 'Courier New', monospace;
    font-size: 0.875em;
    background: #f6f8fa;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    padding: 16px;
    overflow-x: auto;
    margin: 1em 0;
    line-height: 1.5;
  }

  pre code {
    background: none;
    border: none;
    padding: 0;
    font-size: 1em;
    border-radius: 0;
  }

  blockquote {
    margin: 1em 0;
    padding: 0.5em 1em;
    border-left: 4px solid #d0d7de;
    background: #f6f8fa;
    color: #57606a;
    border-radius: 0 4px 4px 0;
  }

  blockquote p:last-child {
    margin-bottom: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
    font-size: 0.95em;
  }

  th, td {
    border: 1px solid #d0d7de;
    padding: 8px 12px;
    text-align: left;
  }

  th {
    background: #f6f8fa;
    font-weight: 600;
    color: #111827;
  }

  tr:nth-child(even) td {
    background: #fafafa;
  }

  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em 0;
    border-radius: 4px;
  }

  ul, ol {
    padding-left: 1.75em;
    margin: 0.5em 0 1em;
  }

  li {
    margin-bottom: 0.25em;
  }

  ul[data-type="taskList"] {
    list-style: none;
    padding-left: 0.25em;
  }

  ul[data-type="taskList"] li {
    display: flex;
    align-items: flex-start;
    gap: 0.5em;
  }

  ul[data-type="taskList"] li input[type="checkbox"] {
    margin-top: 0.3em;
    flex-shrink: 0;
    accent-color: #0969da;
  }

  hr {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 2em 0;
  }

  strong { font-weight: 700; }
  em { font-style: italic; }
  s, del { text-decoration: line-through; color: #6b7280; }
`;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build a self-contained HTML document wrapping the editor's body HTML.
 */
function buildHtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${HTML_CSS}</style>
</head>
<body>
  <div class="content">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

/**
 * Export the editor HTML to a self-contained .html file.
 * Opens a save dialog defaulting to <filename>.html in the same directory,
 * writes the file, and shows a confirmation message with an "Open File" action.
 */
export async function exportToHtml(document: vscode.TextDocument, bodyHtml: string): Promise<void> {
  const documentDir = path.dirname(document.uri.fsPath);
  const baseName = path.basename(document.uri.fsPath, path.extname(document.uri.fsPath));
  const defaultUri = vscode.Uri.file(path.join(documentDir, `${baseName}.html`));

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: { 'HTML Files': ['html', 'htm'] },
    title: 'Export as HTML',
  });

  if (!saveUri) {
    // User cancelled
    return;
  }

  const htmlContent = buildHtmlDocument(baseName, bodyHtml);
  const encoder = new TextEncoder();
  await vscode.workspace.fs.writeFile(saveUri, encoder.encode(htmlContent));

  const fileName = path.basename(saveUri.fsPath);
  const openFile = 'Open File';
  const choice = await vscode.window.showInformationMessage(
    `Exported to ${fileName}`,
    openFile
  );

  if (choice === openFile) {
    await vscode.env.openExternal(saveUri);
  }
}
