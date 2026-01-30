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

    // Track the last content we sent TO the webview or received FROM it
    // This prevents echo loops
    let lastKnownContent = document.getText();
    // Track content that came FROM the webview (to avoid echoing it back)
    let lastWebviewContent = '';
    let pendingWebviewUpdate = false;

    // Send content to webview (only for external changes)
    const updateWebview = () => {
      if (webviewPanel.webview && !pendingWebviewUpdate) {
        const currentContent = document.getText();
        // Only send if content actually changed from what we know
        // AND it's not just echoing back what the webview sent us
        if (currentContent !== lastKnownContent && currentContent !== lastWebviewContent) {
          lastKnownContent = currentContent;
          const message: ExtensionToWebviewMessage = {
            type: 'update',
            payload: { content: currentContent },
          };
          webviewPanel.webview.postMessage(message);
        }
      }
    };

    // Handle messages from webview
    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'ready':
            // Webview is ready, send initial content
            lastKnownContent = document.getText();
            const initMessage: ExtensionToWebviewMessage = {
              type: 'init',
              payload: {
                content: lastKnownContent,
                filename: document.fileName,
              },
            };
            webviewPanel.webview.postMessage(initMessage);
            break;

          case 'update':
            // Content changed in webview, update document
            // Only update if content is actually different
            if (message.payload.content !== lastKnownContent) {
              pendingWebviewUpdate = true;
              lastKnownContent = message.payload.content;
              lastWebviewContent = message.payload.content; // Track what webview sent
              await this.updateDocument(document, message.payload.content);
              // Small delay to let the document change event pass
              setTimeout(() => {
                pendingWebviewUpdate = false;
              }, 100); // Increased from 50ms to 100ms for safer timing
            }
            break;

          case 'requestTemplates':
            // TODO: Implement template loading
            break;

          case 'requestClipboard':
            // Webview is requesting clipboard data (for paste in input fields)
            try {
              const clipboardText = await vscode.env.clipboard.readText();
              webviewPanel.webview.postMessage({
                type: 'clipboardData',
                payload: { text: clipboardText },
              });
            } catch (err) {
              console.error('Failed to read clipboard:', err);
            }
            break;
        }
      }
    );

    // Handle document changes from outside (git, other editors, etc.)
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          // Only notify webview if this wasn't from the webview itself
          if (!pendingWebviewUpdate && e.contentChanges.length > 0) {
            updateWebview();
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
