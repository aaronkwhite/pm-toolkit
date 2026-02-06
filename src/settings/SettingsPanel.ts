/**
 * Settings Panel
 *
 * WebviewPanel for PM Toolkit settings - styled to match Cursor's settings UI
 */

import * as vscode from 'vscode';

export class SettingsPanel {
  public static currentPanel: SettingsPanel | undefined;
  private static readonly viewType = 'pmtoolkit.settings';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.update();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'browseFolder':
            await this.browseFolder();
            break;
          case 'updateSetting':
            await this.updateSetting(message.key, message.value);
            break;
          case 'openExternal':
            vscode.env.openExternal(vscode.Uri.parse(message.url));
            break;
        }
      },
      null,
      this.disposables
    );

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(
      (e) => {
        if (e.affectsConfiguration('pmtoolkit')) {
          this.update();
        }
      },
      null,
      this.disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SettingsPanel.currentPanel) {
      SettingsPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      SettingsPanel.viewType,
      'PM Toolkit Settings',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    SettingsPanel.currentPanel = new SettingsPanel(panel, extensionUri);
  }

  private async browseFolder() {
    const folder = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
      title: 'Select Template Folder',
      openLabel: 'Select Folder',
    });

    if (folder && folder[0]) {
      await this.updateSetting('templateFolder', folder[0].fsPath);
    }
  }

  private async updateSetting(key: string, value: unknown) {
    const config = vscode.workspace.getConfiguration('pmtoolkit');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    this.update();
  }

  private update() {
    const config = vscode.workspace.getConfiguration('pmtoolkit');
    const settings = {
      templateFolder: config.get<string>('templateFolder', ''),
      templateWatchEnabled: config.get<boolean>('templateWatchEnabled', true),
      editorFontSize: config.get<number>('editorFontSize', 14),
      imageAssetsPath: config.get<string>('imageAssetsPath', 'assets'),
      kanbanSaveDelay: config.get<number>('kanbanSaveDelay', 150),
      kanbanDefaultColumns: config.get<string>('kanbanDefaultColumns', 'Backlog, In Progress, Done'),
      kanbanShowThumbnails: config.get<boolean>('kanbanShowThumbnails', true),
    };

    // Get version from package.json
    const extension = vscode.extensions.getExtension('pm-toolkit.pm-toolkit');
    const version = extension?.packageJSON?.version || '0.0.0';

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview, settings, version);
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    settings: {
      templateFolder: string;
      templateWatchEnabled: boolean;
      editorFontSize: number;
      imageAssetsPath: string;
      kanbanSaveDelay: number;
      kanbanDefaultColumns: string;
      kanbanShowThumbnails: boolean;
    },
    version: string
  ): string {
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https:;">
  <title>PM Toolkit Settings</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 32px 48px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.5;
    }

    /* Page title */
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .page-tagline {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 24px 0;
    }

    /* Section label outside card */
    .section-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--vscode-descriptionForeground);
      margin: 32px 0 12px 0;
    }

    .section-label:first-of-type {
      margin-top: 0;
    }

    /* Card container */
    .card {
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
      border-radius: 10px;
      overflow: hidden;
    }

    /* Setting row */
    .setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      gap: 24px;
    }

    .setting-row:not(:last-child) {
      position: relative;
    }

    .setting-row:not(:last-child)::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 20px;
      right: 20px;
      height: 1px;
      background: var(--vscode-panel-border, rgba(128, 128, 128, 0.2));
    }

    .setting-content {
      flex: 1;
      min-width: 0;
    }

    .setting-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 2px;
    }

    .setting-description {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin: 0;
    }

    .setting-control {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Folder path display */
    .folder-path {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .folder-path.empty {
      font-style: italic;
    }

    /* Outline button */
    .btn-outline {
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.4));
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.15s, border-color 0.15s;
    }

    .btn-outline:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-foreground);
    }

    /* Primary button (green) */
    .btn-primary {
      padding: 6px 16px;
      font-size: 13px;
      font-weight: 500;
      border: none;
      background: #2e7d32;
      color: white;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 0.15s;
    }

    .btn-primary:hover {
      background: #1b5e20;
    }

    /* Toggle switch - Cursor style (green, pill-shaped) */
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      flex-shrink: 0;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--vscode-widget-border);
      border-radius: 12px;
      transition: background-color 0.2s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      border-radius: 50%;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .toggle input:checked + .toggle-slider {
      background-color: #2e7d32;
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(20px);
    }

    .toggle input:focus + .toggle-slider {
      box-shadow: 0 0 0 2px var(--vscode-focusBorder);
    }

    /* Support section */
    .support-card {
      background: var(--vscode-sideBar-background, var(--vscode-editor-background));
      border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.35));
      border-radius: 10px;
      padding: 20px;
    }

    .support-card p {
      margin: 0 0 16px 0;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
    }

    .coffee-link {
      display: inline-block;
      cursor: pointer;
    }

    .coffee-link img {
      height: 36px;
      border-radius: 6px;
      transition: transform 0.15s, box-shadow 0.15s;
    }

    .coffee-link:hover img {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    /* Version footer */
    .version-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid var(--vscode-widget-border);
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }

    /* Number input */
    .number-input {
      width: 80px;
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.4));
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 6px;
      font-family: inherit;
      text-align: right;
    }

    .number-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }

    .input-suffix {
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      margin-left: 6px;
    }

    /* Text input */
    .text-input {
      width: 240px;
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid var(--vscode-panel-border, rgba(128, 128, 128, 0.4));
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 6px;
      font-family: inherit;
    }

    .text-input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
  </style>
</head>
<body>
  <h1 class="page-title">PM Toolkit</h1>
  <p class="page-tagline">Notion-like editing in Cursor/VS Code — markdown, kanban, and diagrams in one extension.</p>

  <div class="section-label">Editor</div>
  <div class="card">
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Font Size</div>
        <p class="setting-description">Font size for the markdown editor and kanban board</p>
      </div>
      <div class="setting-control">
        <input type="number" class="number-input" id="editorFontSize" value="${settings.editorFontSize}" min="10" max="24" />
        <span class="input-suffix">px</span>
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Image Assets Path</div>
        <p class="setting-description">Directory where uploaded images are saved (relative to the document)</p>
      </div>
      <div class="setting-control">
        <input type="text" class="text-input" id="imageAssetsPath" value="${escapeHtml(settings.imageAssetsPath || 'assets')}" placeholder="assets" />
      </div>
    </div>
  </div>

  <div class="section-label">Templates</div>
  <div class="card">
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Template Folder</div>
        <p class="setting-description">Folder containing template markdown files for the slash menu</p>
      </div>
      <div class="setting-control">
        <span class="folder-path ${settings.templateFolder ? '' : 'empty'}" title="${escapeHtml(settings.templateFolder)}">
          ${settings.templateFolder ? escapeHtml(truncatePath(settings.templateFolder)) : 'Not set'}
        </span>
        <button class="btn-outline" id="browseBtn">Browse</button>
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Watch for Changes</div>
        <p class="setting-description">Auto-reload templates when files in the folder change</p>
      </div>
      <div class="setting-control">
        <label class="toggle">
          <input type="checkbox" id="watchEnabled" ${settings.templateWatchEnabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>

  <div class="section-label">Kanban</div>
  <div class="card">
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Default Columns</div>
        <p class="setting-description">Comma-separated list of columns for new kanban boards</p>
      </div>
      <div class="setting-control">
        <input type="text" class="text-input" id="kanbanDefaultColumns" value="${escapeHtml(settings.kanbanDefaultColumns)}" />
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Show Thumbnails</div>
        <p class="setting-description">Show image thumbnails on kanban cards by default</p>
      </div>
      <div class="setting-control">
        <label class="toggle">
          <input type="checkbox" id="kanbanShowThumbnails" ${settings.kanbanShowThumbnails ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="setting-row">
      <div class="setting-content">
        <div class="setting-title">Save Delay</div>
        <p class="setting-description">Delay before saving changes to disk. Lower values save faster but may cause more disk writes during rapid editing.</p>
      </div>
      <div class="setting-control">
        <input type="number" class="number-input" id="kanbanSaveDelay" value="${settings.kanbanSaveDelay}" min="50" max="2000" step="50" />
        <span class="input-suffix">ms</span>
      </div>
    </div>
  </div>

  <div class="section-label">Support the Project</div>
  <div class="support-card">
    <p>If PM Toolkit saves you time, consider buying me a coffee. Your support helps keep this project maintained and free for everyone.</p>
    <a class="coffee-link" id="coffeeLink">
      <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" />
    </a>
  </div>

  <div class="version-footer">
    PM Toolkit v${version}
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    document.getElementById('browseBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'browseFolder' });
    });

    document.getElementById('watchEnabled').addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'updateSetting',
        key: 'templateWatchEnabled',
        value: e.target.checked
      });
    });

    document.getElementById('editorFontSize').addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 10 && value <= 24) {
        vscode.postMessage({
          type: 'updateSetting',
          key: 'editorFontSize',
          value: value
        });
      }
    });

    document.getElementById('imageAssetsPath').addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'updateSetting',
        key: 'imageAssetsPath',
        value: e.target.value.trim() || 'assets'
      });
    });

    document.getElementById('kanbanDefaultColumns').addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'updateSetting',
        key: 'kanbanDefaultColumns',
        value: e.target.value
      });
    });

    document.getElementById('kanbanShowThumbnails').addEventListener('change', (e) => {
      vscode.postMessage({
        type: 'updateSetting',
        key: 'kanbanShowThumbnails',
        value: e.target.checked
      });
    });

    document.getElementById('kanbanSaveDelay').addEventListener('change', (e) => {
      const value = parseInt(e.target.value, 10);
      if (value >= 50 && value <= 2000) {
        vscode.postMessage({
          type: 'updateSetting',
          key: 'kanbanSaveDelay',
          value: value
        });
      }
    });

    document.getElementById('coffeeLink').addEventListener('click', () => {
      vscode.postMessage({
        type: 'openExternal',
        url: 'https://buymeacoffee.com/aaronkwhite'
      });
    });
  </script>
</body>
</html>`;
  }

  public dispose() {
    SettingsPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function truncatePath(path: string, maxLength: number = 30): string {
  if (path.length <= maxLength) return path;
  const parts = path.split('/');
  if (parts.length <= 2) return '...' + path.slice(-maxLength + 3);
  return '.../' + parts.slice(-2).join('/');
}
