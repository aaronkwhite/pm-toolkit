import * as vscode from 'vscode';
import * as path from 'path';
import { HTMLBuilder } from './HTMLBuilder';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types';

export class KanbanEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'pmtoolkit.kanbanEditor';

  private updateTimeout: NodeJS.Timeout | undefined;
  private static readonly DEBOUNCE_MS = 150;

  // Track active webview panels for commands
  private static activeWebviewPanels = new Map<string, vscode.WebviewPanel>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Toggle the showThumbnails setting for the active kanban document
   */
  public static async toggleThumbnails(): Promise<void> {
    const activeEditor = vscode.window.activeTextEditor;
    const visibleEditors = vscode.window.visibleTextEditors;

    // Find the active kanban document
    let document: vscode.TextDocument | undefined;

    // Check visible custom editors via their documents
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.fileName.endsWith('.kanban')) {
        // Check if we have an active panel for this document
        if (KanbanEditorProvider.activeWebviewPanels.has(doc.uri.toString())) {
          document = doc;
          break;
        }
      }
    }

    if (!document) {
      vscode.window.showWarningMessage('No active Kanban board found');
      return;
    }

    const content = document.getText();
    let newContent: string;

    // Toggle [no-thumbnails] in preamble
    if (/\[no-thumbnails\]/i.test(content)) {
      // Remove [no-thumbnails]
      newContent = content.replace(/\s*\[no-thumbnails\]\s*/gi, '\n').replace(/^\n+/, '');
    } else {
      // Add [no-thumbnails] at the start
      newContent = '[no-thumbnails]\n\n' + content;
    }

    // Apply the edit
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      newContent
    );
    await vscode.workspace.applyEdit(edit);
  }

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
    // If document has unsaved changes (possibly from Cursor diff), save them first
    if (document.isDirty) {
      await document.save();
    }

    // Get the directory of the document for resolving relative image paths
    const documentDir = vscode.Uri.file(path.dirname(document.uri.fsPath));

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        documentDir,
        // Also allow workspace folders
        ...(vscode.workspace.workspaceFolders?.map((f) => f.uri) || []),
      ],
    };

    webviewPanel.webview.html = HTMLBuilder.getKanbanHTML(
      webviewPanel.webview,
      this.context.extensionUri
    );

    // Track this panel for commands
    KanbanEditorProvider.activeWebviewPanels.set(document.uri.toString(), webviewPanel);

    let isUpdatingFromExtension = false;

    const updateWebview = () => {
      if (webviewPanel?.webview && document) {
        try {
          const message: ExtensionToWebviewMessage = {
            type: 'update',
            payload: { content: document.getText() || '' },
          };
          webviewPanel.webview.postMessage(message);
        } catch (err) {
          console.error('Failed to update kanban webview:', err);
        }
      }
    };

    const messageHandler = webviewPanel.webview.onDidReceiveMessage(
      async (message: WebviewToExtensionMessage) => {
        switch (message.type) {
          case 'ready':
            try {
              // Ensure document and webview are valid before sending
              if (!document || !webviewPanel?.webview) {
                console.error('Kanban: Document or webview not available');
                return;
              }
              const content = document.getText() || '';
              const initMessage: ExtensionToWebviewMessage = {
                type: 'init',
                payload: {
                  content,
                  filename: document.fileName || 'untitled.kanban',
                },
              };
              webviewPanel.webview.postMessage(initMessage);
            } catch (err) {
              console.error('Failed to initialize kanban webview:', err);
            }
            break;

          case 'update':
            // Debounce updates to avoid excessive writes
            if (!isUpdatingFromExtension) {
              this.debouncedUpdate(document, message.payload.content);
            }
            break;

          case 'requestImageUrl':
            // Convert relative image path to webview URL
            try {
              const imagePath = message.payload.path;
              let imageUri: vscode.Uri;

              if (path.isAbsolute(imagePath)) {
                imageUri = vscode.Uri.file(imagePath);
              } else {
                // Resolve relative to document directory
                imageUri = vscode.Uri.file(
                  path.resolve(path.dirname(document.uri.fsPath), imagePath)
                );
              }

              const webviewUrl = webviewPanel.webview.asWebviewUri(imageUri).toString();
              webviewPanel.webview.postMessage({
                type: 'imageUrl',
                payload: {
                  originalPath: imagePath,
                  webviewUrl,
                },
              });
            } catch (err) {
              console.error('Failed to resolve image URL:', err);
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
      KanbanEditorProvider.activeWebviewPanels.delete(document.uri.toString());
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
