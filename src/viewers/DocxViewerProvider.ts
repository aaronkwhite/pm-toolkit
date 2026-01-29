import * as vscode from 'vscode';
import * as fs from 'fs';

export class DocxViewerProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'pmtoolkit.docxViewer';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new DocxViewerProvider(context);
    return vscode.window.registerCustomEditorProvider(
      DocxViewerProvider.viewType,
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

    // Read the file and convert to base64
    const fileData = await fs.promises.readFile(document.uri.fsPath);
    const base64Data = fileData.toString('base64');

    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'docx-viewer.js')
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewPanel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webviewPanel.webview.cspSource}; img-src ${webviewPanel.webview.cspSource} data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>Word Viewer</title>
</head>
<body>
  <div class="viewer-toolbar">
    <div class="toolbar-group">
      <button id="zoomOut" title="Zoom out">-</button>
      <span id="zoomLevel">100%</span>
      <button id="zoomIn" title="Zoom in">+</button>
      <button id="resetZoom" title="Reset zoom">Reset</button>
    </div>
  </div>
  <div id="viewer" class="viewer-content document-view">
    <div id="content" class="document-content"></div>
  </div>
  <script nonce="${nonce}">
    window.docxData = "${base64Data}";
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
