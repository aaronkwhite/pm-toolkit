import * as vscode from 'vscode';
import { HTMLBuilder } from './HTMLBuilder';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types';

export class KanbanEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'pmtoolkit.kanbanEditor';

  private updateTimeout: NodeJS.Timeout | undefined;
  private static readonly DEBOUNCE_MS = 150;

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new KanbanEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      KanbanEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };

    webviewPanel.webview.html = HTMLBuilder.getKanbanHTML(
      webviewPanel.webview,
      this.context.extensionUri
    );

    let isUpdatingFromExtension = false;

    const updateWebview = () => {
      if (webviewPanel.webview) {
        const message: ExtensionToWebviewMessage = {
          type: 'update',
          payload: { content: document.getText() },
        };
        webviewPanel.webview.postMessage(message);
      }
    };

    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'ready':
            const initMessage: ExtensionToWebviewMessage = {
              type: 'init',
              payload: {
                content: document.getText(),
                filename: document.fileName,
              },
            };
            webviewPanel.webview.postMessage(initMessage);
            break;

          case 'update':
            // Debounce updates to avoid excessive writes
            if (!isUpdatingFromExtension) {
              this.debouncedUpdate(document, message.payload.content);
            }
            break;
        }
      }
    );

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          if (e.contentChanges.length > 0 && !isUpdatingFromExtension) {
            isUpdatingFromExtension = true;
            updateWebview();
            isUpdatingFromExtension = false;
          }
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      messageHandler.dispose();
      changeDocumentSubscription.dispose();
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }
    });
  }

  private debouncedUpdate(document: vscode.TextDocument, content: string): void {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.updateTimeout = setTimeout(async () => {
      await this.updateDocument(document, content);
    }, KanbanEditorProvider.DEBOUNCE_MS);
  }

  private async updateDocument(
    document: vscode.TextDocument,
    content: string
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      content
    );
    await vscode.workspace.applyEdit(edit);
  }
}
