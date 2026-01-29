import * as vscode from 'vscode';

/**
 * Builds HTML for webviews with proper CSP and asset loading
 */
export class HTMLBuilder {
  /**
   * Generate a cryptographically random nonce for CSP
   */
  private static getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Generate HTML for the markdown editor webview
   */
  public static getEditorHTML(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    const nonce = this.getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'editor.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'editor.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data: https:;
        font-src ${webview.cspSource};
    ">
    <link href="${styleUri}" rel="stylesheet">
    <title>PM Toolkit Editor</title>
</head>
<body>
    <div id="editor"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate HTML for the kanban board webview
   */
  public static getKanbanHTML(
    webview: vscode.Webview,
    extensionUri: vscode.Uri
  ): string {
    const nonce = this.getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'kanban.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'kanban.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data: https:;
        font-src ${webview.cspSource};
    ">
    <link href="${styleUri}" rel="stylesheet">
    <title>Kanban Board</title>
</head>
<body>
    <div id="board"></div>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  /**
   * Generate HTML for file viewers (PDF, Word, Excel, CSV)
   */
  public static getViewerHTML(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    viewerType: 'pdf' | 'docx' | 'excel' | 'csv',
    fileData: string
  ): string {
    const nonce = this.getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', `${viewerType}-viewer.js`)
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'viewer.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        style-src ${webview.cspSource} 'unsafe-inline';
        script-src 'nonce-${nonce}';
        img-src ${webview.cspSource} data: blob: https:;
        font-src ${webview.cspSource};
        worker-src blob:;
    ">
    <link href="${styleUri}" rel="stylesheet">
    <title>${viewerType.toUpperCase()} Viewer</title>
</head>
<body>
    <div id="toolbar"></div>
    <div id="viewer"></div>
    <script nonce="${nonce}">
        window.fileData = "${fileData}";
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
