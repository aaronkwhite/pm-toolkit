/**
 * Settings Panel
 *
 * WebviewPanel for PM Toolkit settings
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
    const templateFolder = config.get<string>('templateFolder', '');
    const templateWatchEnabled = config.get<boolean>('templateWatchEnabled', true);

    // Get version from package.json
    const extension = vscode.extensions.getExtension('pm-toolkit.pm-toolkit');
    const version = extension?.packageJSON?.version || '0.0.0';

    this.panel.webview.html = this.getHtmlForWebview(
      this.panel.webview,
      { templateFolder, templateWatchEnabled },
      version
    );
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    settings: { templateFolder: string; templateWatchEnabled: boolean },
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
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
      padding: 20px 40px;
      max-width: 700px;
      margin: 0 auto;
      line-height: 1.5;
    }

    .header {
      margin-bottom: 32px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }

    .header h1 {
      margin: 0 0 4px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .header .version {
      color: var(--vscode-descriptionForeground);
      font-size: 13px;
      margin-bottom: 8px;
    }

    .header .description {
      color: var(--vscode-descriptionForeground);
      font-size: 14px;
      margin: 0;
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
    }

    .setting-row {
      margin-bottom: 20px;
    }

    .setting-label {
      font-weight: 500;
      margin-bottom: 6px;
    }

    .setting-description {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    .folder-input {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .folder-input input {
      flex: 1;
      padding: 6px 10px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }

    .folder-input input:focus {
      outline: 1px solid var(--vscode-focusBorder);
      border-color: var(--vscode-focusBorder);
    }

    .folder-input input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    button {
      padding: 6px 14px;
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }

    button:hover {
      background: var(--vscode-button-hoverBackground);
    }

    .toggle-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .toggle {
      position: relative;
      width: 36px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 2px;
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
      background-color: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 10px;
      transition: 0.2s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 2px;
      bottom: 2px;
      background-color: var(--vscode-foreground);
      border-radius: 50%;
      transition: 0.2s;
    }

    .toggle input:checked + .toggle-slider {
      background-color: var(--vscode-button-background);
      border-color: var(--vscode-button-background);
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(16px);
      background-color: var(--vscode-button-foreground);
    }

    .toggle input:focus + .toggle-slider {
      outline: 1px solid var(--vscode-focusBorder);
    }

    .toggle-content {
      flex: 1;
    }

    .support-section {
      padding: 20px;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 8px;
      border-left: 3px solid var(--vscode-textLink-foreground);
    }

    .support-section p {
      margin: 0 0 16px 0;
      color: var(--vscode-foreground);
    }

    .coffee-link {
      display: inline-block;
      cursor: pointer;
    }

    .coffee-link img {
      height: 40px;
      border-radius: 6px;
      transition: transform 0.2s;
    }

    .coffee-link:hover img {
      transform: scale(1.05);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PM Toolkit</h1>
    <div class="version">Version ${version}</div>
    <p class="description">WYSIWYG markdown, kanban boards, and file viewers for Cursor.</p>
  </div>

  <div class="section">
    <div class="section-title">Templates</div>

    <div class="setting-row">
      <div class="setting-label">Template Folder</div>
      <div class="folder-input">
        <input
          type="text"
          id="templateFolder"
          value="${escapeHtml(settings.templateFolder)}"
          placeholder="No folder selected"
          readonly
        />
        <button id="browseBtn">Browse</button>
      </div>
      <div class="setting-description">Folder containing template markdown files for the slash menu.</div>
    </div>

    <div class="setting-row">
      <div class="toggle-row">
        <label class="toggle">
          <input type="checkbox" id="watchEnabled" ${settings.templateWatchEnabled ? 'checked' : ''} />
          <span class="toggle-slider"></span>
        </label>
        <div class="toggle-content">
          <div class="setting-label">Watch for changes</div>
          <div class="setting-description">Auto-reload templates when files in the folder change.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Support the Project</div>
    <div class="support-section">
      <p>If PM Toolkit saves you time, consider buying me a coffee. Your support helps keep this project maintained and free for everyone.</p>
      <a class="coffee-link" id="coffeeLink">
        <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" />
      </a>
    </div>
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
