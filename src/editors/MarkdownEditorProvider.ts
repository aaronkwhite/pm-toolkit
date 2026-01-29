import * as vscode from 'vscode';
import { HTMLBuilder } from './HTMLBuilder';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types';

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'pmtoolkit.markdownEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
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
    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };

    // Set initial HTML
    webviewPanel.webview.html = HTMLBuilder.getEditorHTML(
      webviewPanel.webview,
      this.context.extensionUri
    );

    // Track if we're currently updating from extension to prevent loops
    let isUpdatingFromExtension = false;

    // Send content to webview
    const updateWebview = () => {
      if (webviewPanel.webview) {
        const message: ExtensionToWebviewMessage = {
          type: 'update',
          payload: { content: document.getText() },
        };
        webviewPanel.webview.postMessage(message);
      }
    };

    // Handle messages from webview
    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'ready':
            // Webview is ready, send initial content
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
            // Content changed in webview, update document
            if (!isUpdatingFromExtension) {
              await this.updateDocument(document, message.payload.content);
            }
            break;

          case 'requestTemplates':
            // TODO: Implement template loading
            break;
        }
      }
    );

    // Handle document changes from outside (git, other editors)
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

    // Cleanup on dispose
    webviewPanel.onDidDispose(() => {
      messageHandler.dispose();
      changeDocumentSubscription.dispose();
    });
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
