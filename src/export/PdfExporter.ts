import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer-core';

/**
 * Platform-specific Chrome/Chromium executable paths to search
 */
const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    `${process.env.LOCALAPPDATA}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`,
  ],
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/usr/bin/microsoft-edge',
    '/usr/bin/brave-browser',
  ],
};

/**
 * Find Chrome/Chromium executable on the current platform
 */
function findChromePath(): string | undefined {
  const platform = process.platform;
  const candidates = CHROME_PATHS[platform] || CHROME_PATHS.linux;

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Resolve Chrome path: user setting → auto-detect → error
 */
function resolveChromePath(): string {
  const config = vscode.workspace.getConfiguration('pmtoolkit');
  const userPath = config.get<string>('pdfChromePath', '');

  if (userPath) {
    if (fs.existsSync(userPath)) {
      return userPath;
    }
    throw new Error(
      `Chrome path from settings not found: ${userPath}\n\nUpdate pmtoolkit.pdfChromePath in settings.`
    );
  }

  const detected = findChromePath();
  if (detected) {
    return detected;
  }

  throw new Error(
    'Could not find Chrome, Chromium, Edge, or Brave.\n\n' +
    'Install one of these browsers, or set the path manually:\n' +
    'Settings → pmtoolkit.pdfChromePath'
  );
}

/**
 * CSS variable replacements for print-friendly output.
 * These replace VS Code theme variables with hardcoded light-theme values
 * suitable for PDF output.
 */
const CSS_VAR_REPLACEMENTS: Record<string, string> = {
  '--vscode-editor-background': '#ffffff',
  '--vscode-editor-foreground': '#1e1e1e',
  '--vscode-foreground': '#1e1e1e',
  '--vscode-font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  '--vscode-editor-font-family': "'SF Mono', Monaco, Menlo, Consolas, monospace",
  '--vscode-font-size': '14px',
  '--vscode-textLink-foreground': '#0969da',
  '--vscode-textLink-activeForeground': '#0550ae',
  '--vscode-textBlockQuote-border': '#d0d7de',
  '--vscode-textBlockQuote-background': '#f6f8fa',
  '--vscode-textCodeBlock-background': '#f6f8fa',
  '--vscode-panel-border': '#d0d7de',
  '--vscode-focusBorder': '#0969da',
  '--vscode-editor-lineHighlightBackground': '#f6f8fa',
  '--vscode-input-placeholderForeground': '#6e7781',
  '--vscode-descriptionForeground': '#6e7781',
  '--vscode-errorForeground': '#cf222e',
  '--vscode-inputValidation-errorBackground': '#ffebe9',
  '--vscode-inputValidation-errorBorder': '#cf222e',
  '--vscode-list-hoverBackground': '#f3f4f6',
  '--vscode-list-activeSelectionBackground': '#0969da',
  '--vscode-list-activeSelectionForeground': '#ffffff',
  '--vscode-button-background': '#0969da',
  '--vscode-button-foreground': '#ffffff',
  '--vscode-button-hoverBackground': '#0550ae',
  '--vscode-menu-background': '#ffffff',
  '--vscode-menu-foreground': '#1e1e1e',
  '--vscode-menu-border': '#d0d7de',
  '--vscode-editorWidget-background': '#ffffff',
  '--vscode-editorWidget-border': '#d0d7de',
  '--vscode-scrollbarSlider-background': 'rgba(0, 0, 0, 0.1)',
  '--vscode-toolbar-hoverBackground': 'rgba(0, 0, 0, 0.05)',
  '--vscode-editor-hoverHighlightBackground': 'rgba(0, 0, 0, 0.04)',
  '--vscode-input-background': '#ffffff',
  '--vscode-input-foreground': '#1e1e1e',
  '--vscode-input-border': '#d0d7de',
  '--vscode-button-secondaryBackground': '#f3f4f6',
  '--vscode-button-secondaryForeground': '#1e1e1e',
  '--vscode-menu-selectionBackground': '#0969da',
  '--vscode-menu-selectionForeground': '#ffffff',
};

/**
 * Replace CSS var() references with hardcoded values for PDF rendering.
 *
 * Strategy:
 * 1. Replace known VS Code CSS variables with print-friendly values
 * 2. For any remaining var() with a fallback, extract the fallback value
 * 3. For color-mix() using CSS vars, simplify to the fallback
 */
function replaceCssVariables(css: string): string {
  let result = css;

  // Replace known variables: var(--vscode-foo) → value
  // Also handles: var(--vscode-foo, fallback) → value
  for (const [varName, value] of Object.entries(CSS_VAR_REPLACEMENTS)) {
    // Match var(--name) or var(--name, fallback)
    const escaped = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`var\\(${escaped}(?:,\\s*[^)]+)?\\)`, 'g');
    result = result.replace(pattern, value);
  }

  // Handle pmtoolkit custom vars that reference theme vars
  result = result.replace(
    /--pmtoolkit-accent:\s*var\([^)]+\);/g,
    '--pmtoolkit-accent: #0969da;'
  );
  result = result.replace(
    /--pmtoolkit-accent-bg:\s*[^;]+;/g,
    '--pmtoolkit-accent-bg: rgba(9, 105, 218, 0.15);'
  );

  // Catch-all: remaining var(--anything, fallback) → fallback
  result = result.replace(
    /var\(--[a-zA-Z0-9-]+,\s*([^)]+)\)/g,
    (_match, fallback) => fallback.trim()
  );

  // Remaining var(--anything) with no fallback → remove gracefully
  // (these would be theme vars we don't have a replacement for)
  result = result.replace(/var\(--[a-zA-Z0-9-]+\)/g, 'inherit');

  // Replace color-mix references that may still have var() inside
  result = result.replace(
    /color-mix\(in srgb,\s*inherit\s+(\d+%),\s*transparent\)/g,
    (_match, pct) => `rgba(9, 105, 218, ${parseInt(pct) / 100})`
  );

  return result;
}

/**
 * Resolve relative image paths in HTML to file:// URLs for Puppeteer.
 * Handles data-original-src attributes from the editor.
 */
function resolveImagePaths(html: string, documentDir: string): string {
  return html.replace(
    /<img\s([^>]*?)src="([^"]+)"([^>]*?)>/g,
    (match, before: string, src: string, after: string) => {
      // Skip absolute URLs, data URIs, and file:// URLs
      if (/^(https?:|data:|file:)/i.test(src)) {
        return match;
      }

      // Check for data-original-src which has the real relative path
      const originalSrcMatch = (before + after).match(/data-original-src="([^"]+)"/);
      const relativePath = originalSrcMatch ? originalSrcMatch[1] : src;

      // Skip if already absolute
      if (/^(https?:|data:|file:)/i.test(relativePath)) {
        return match;
      }

      const absolutePath = path.resolve(documentDir, relativePath);
      const fileUrl = `file://${absolutePath}`;
      return `<img ${before}src="${fileUrl}"${after}>`;
    }
  );
}

/**
 * PDF-specific CSS to hide interactive elements and add print styling
 */
const PDF_CSS = `
  /* Hide interactive elements */
  .block-handle-container,
  .document-outline,
  .bubble-menu,
  .image-resize-handle,
  .image-popover-toolbar,
  .table-add-row-bar,
  .table-add-column-bar,
  .table-row-grip,
  .table-col-grip,
  .table-grip-menu,
  .table-selection-highlight,
  .table-drop-indicator,
  .table-size-picker,
  .link-picker,
  .slash-command-menu-container,
  .mermaid-toolbar,
  .mermaid-view-toggle,
  .mermaid-edit,
  .mermaid-textarea,
  .block-drop-indicator,
  .ProseMirror-gapcursor {
    display: none !important;
  }

  /* Remove editor chrome */
  #editor-wrapper {
    padding-left: 0 !important;
  }

  .ProseMirror {
    min-height: auto !important;
  }

  /* Page break hints */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    break-after: avoid;
  }

  table, pre, .mermaid-node, .image-node-view {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Ensure images fit within page */
  img {
    max-width: 100% !important;
    height: auto !important;
  }

  /* Mermaid diagrams - ensure they render in fit mode */
  .mermaid-diagram {
    max-height: none !important;
    overflow: visible !important;
  }

  .mermaid-diagram svg {
    max-width: 100% !important;
    height: auto !important;
  }
`;

/**
 * Build a standalone HTML document for PDF rendering
 */
export function prepareHtml(
  htmlContent: string,
  documentDir: string,
  cssContent: string
): string {
  const processedCss = replaceCssVariables(cssContent);
  const processedHtml = resolveImagePaths(htmlContent, documentDir);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${processedCss}</style>
  <style>${PDF_CSS}</style>
</head>
<body>
  <div id="editor">
    <div id="editor-wrapper">
      <div class="ProseMirror">
        ${processedHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export interface PdfExportOptions {
  htmlContent: string;
  documentUri: vscode.Uri;
  cssContent: string;
}

/**
 * Export editor HTML to PDF using puppeteer-core
 */
export async function exportToPdf(options: PdfExportOptions): Promise<string> {
  const { htmlContent, documentUri, cssContent } = options;

  const chromePath = resolveChromePath();
  const documentDir = path.dirname(documentUri.fsPath);

  // Build output path: same directory as source, .pdf extension
  const baseName = path.basename(documentUri.fsPath, path.extname(documentUri.fsPath));
  const pdfPath = path.join(documentDir, `${baseName}.pdf`);

  // Get user settings
  const config = vscode.workspace.getConfiguration('pmtoolkit');
  const pageSize = config.get<string>('pdfPageSize', 'A4');
  const marginTop = config.get<string>('pdfMarginTop', '20mm');
  const marginBottom = config.get<string>('pdfMarginBottom', '20mm');
  const marginLeft = config.get<string>('pdfMarginLeft', '15mm');
  const marginRight = config.get<string>('pdfMarginRight', '15mm');
  const printBackground = config.get<boolean>('pdfPrintBackground', true);

  // Prepare HTML
  const fullHtml = prepareHtml(htmlContent, documentDir, cssContent);

  // Launch browser and generate PDF
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Allow file:// access for local images
    await page.setContent(fullHtml, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    await page.pdf({
      path: pdfPath,
      format: pageSize as any,
      margin: {
        top: marginTop,
        bottom: marginBottom,
        left: marginLeft,
        right: marginRight,
      },
      printBackground,
    });

    return pdfPath;
  } finally {
    await browser.close();
  }
}
