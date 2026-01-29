import * as vscode from 'vscode';

export class PDFViewerProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'pmtoolkit.pdfViewer';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new PDFViewerProvider(context);
    return vscode.window.registerCustomEditorProvider(
      PDFViewerProvider.viewType,
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

    // Convert the file URI to a webview URI
    const fileUri = webviewPanel.webview.asWebviewUri(document.uri);

    // Get the PDF.js worker from node_modules
    const workerUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs')
    );

    const scriptUri = webviewPanel.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'pdf-viewer.js')
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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webviewPanel.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' ${webviewPanel.webview.cspSource}; worker-src blob:; img-src ${webviewPanel.webview.cspSource} blob: data:;">
  <link rel="stylesheet" href="${styleUri}">
  <title>PDF Viewer</title>
</head>
<body>
  <div class="viewer-toolbar">
    <div class="toolbar-group">
      <button id="prev" title="Previous page">&#9664;</button>
      <span id="pageInfo">Page <span id="currentPage">1</span> of <span id="totalPages">-</span></span>
      <button id="next" title="Next page">&#9654;</button>
    </div>
    <div class="toolbar-group">
      <button id="zoomOut" title="Zoom out">-</button>
      <span id="zoomLevel">100%</span>
      <button id="zoomIn" title="Zoom in">+</button>
      <button id="fitWidth" title="Fit to width">Fit</button>
    </div>
    <div class="toolbar-group">
      <button id="rotateLeft" title="Rotate left">↺</button>
      <button id="rotateRight" title="Rotate right">↻</button>
    </div>
  </div>
  <div id="viewer" class="viewer-content">
    <canvas id="pdfCanvas"></canvas>
  </div>
  <script nonce="${nonce}">
    window.pdfUrl = "${fileUri}";
    window.workerUrl = "${workerUri}";
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
