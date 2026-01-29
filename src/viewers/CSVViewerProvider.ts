import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class CSVViewerProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'pmtoolkit.csvViewer';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new CSVViewerProvider(context);
    return vscode.window.registerCustomEditorProvider(
      CSVViewerProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: true,
      }
    );
  }

  public async openCustomDocument(
    uri: vscode.Uri,
    _openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    return { uri, dispose: () => {} };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };

    // Read the file as text
    const fileContent = await fs.promises.readFile(document.uri.fsPath, 'utf-8');
    const filename = path.basename(document.uri.fsPath);

    // Escape for embedding in JS
    const escapedContent = JSON.stringify(fileContent);

    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'csv-viewer.js')
    );

    const styleUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'viewer.css')
    );

    const nonce = this.getNonce();

    webviewPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewPanel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webviewPanel.webview.cspSource};">
  <link rel="stylesheet" href="${styleUri}">
  <title>CSV Viewer</title>
</head>
<body>
  <div class="viewer-toolbar">
    <div class="toolbar-group">
      <label class="toolbar-checkbox">
        <input type="checkbox" id="headerToggle" checked />
        First row as header
      </label>
      <select id="delimiterSelect">
        <option value="">Auto-detect</option>
        <option value=",">Comma (,)</option>
        <option value=";">Semicolon (;)</option>
        <option value="&#9;">Tab</option>
        <option value="|">Pipe (|)</option>
      </select>
    </div>
    <div class="toolbar-group">
      <span id="rowCount">0 rows</span>
    </div>
    <div class="toolbar-group">
      <button id="zoomOut" title="Zoom out">-</button>
      <span id="zoomLevel">100%</span>
      <button id="zoomIn" title="Zoom in">+</button>
      <button id="resetZoom" title="Reset zoom">Reset</button>
    </div>
  </div>
  <div id="viewer" class="viewer-content spreadsheet-view">
    <div id="tableContainer"></div>
  </div>
  <script nonce="${nonce}">
    window.csvData = ${escapedContent};
    window.filename = "${filename}";
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
