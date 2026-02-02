import * as vscode from 'vscode';
import { HTMLBuilder } from './HTMLBuilder';
import { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../types';
import { TemplateManager } from '../templates/TemplateManager';

/**
 * Convert relative image paths in markdown to webview URIs
 * Preserves the original path in a data attribute for display/editing
 *
 * Instead of outputting markdown like: ![alt](webview-url)
 * We output HTML like: <img src="webview-url" data-original-src="original-path" alt="...">
 * This allows the ImageNode to display the original path in the edit field
 */
function convertImagePathsToWebview(
  markdown: string,
  documentUri: vscode.Uri,
  webview: vscode.Webview
): string {
  // Match image markdown: ![alt](path)
  // Captures the path which may be relative or absolute
  return markdown.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    (match, alt, imagePath) => {
      // Skip URLs (http, https, data)
      if (/^(https?:|data:)/i.test(imagePath)) {
        return match;
      }

      // Skip already converted webview URIs
      if (imagePath.includes('vscode-webview-resource:')) {
        return match;
      }

      try {
        // Resolve the path relative to the document
        const documentDir = vscode.Uri.joinPath(documentUri, '..');
        const imageUri = vscode.Uri.joinPath(documentDir, imagePath);
        const webviewUri = webview.asWebviewUri(imageUri);
        // Output HTML with both the webview URI (for rendering) and original path (for editing)
        // Escape any quotes in alt and paths for HTML attributes
        const escapedAlt = alt.replace(/"/g, '&quot;');
        const escapedOriginal = imagePath.replace(/"/g, '&quot;');
        return `<img src="${webviewUri.toString()}" data-original-src="${escapedOriginal}" alt="${escapedAlt}">`;
      } catch {
        // If conversion fails, return original
        return match;
      }
    }
  );
}

// Note: convertImagePathsFromWebview() has been removed.
// Image paths are now preserved via the data-original-src attribute and
// the ImageNode's originalSrc property, which is used during markdown serialization.

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'pmtoolkit.markdownEditor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly templateManager: TemplateManager
  ) {}

  public static register(
    context: vscode.ExtensionContext,
    templateManager: TemplateManager
  ): vscode.Disposable {
    const provider = new MarkdownEditorProvider(context, templateManager);
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
    // Get the document's directory for local image resolution
    const documentDir = vscode.Uri.joinPath(document.uri, '..');

    // Also include workspace folders if available
    const workspaceFolders = vscode.workspace.workspaceFolders?.map(f => f.uri) || [];

    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        documentDir,
        ...workspaceFolders,
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
          // Convert relative image paths to webview URIs
          const contentWithWebviewUris = convertImagePathsToWebview(
            currentContent,
            document.uri,
            webviewPanel.webview
          );
          const message: ExtensionToWebviewMessage = {
            type: 'update',
            payload: { content: contentWithWebviewUris },
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
            try {
              lastKnownContent = document.getText();
              // Convert relative image paths to webview URIs
              const contentWithWebviewUris = convertImagePathsToWebview(
                lastKnownContent,
                document.uri,
                webviewPanel.webview
              );
              const initMessage: ExtensionToWebviewMessage = {
                type: 'init',
                payload: {
                  content: contentWithWebviewUris,
                  filename: document.fileName,
                },
              };
              webviewPanel.webview.postMessage(initMessage);
            } catch (err) {
              console.error('Failed to get document text:', err);
              // Document might be stale after extension reload
              // The webview's persisted state will be used as fallback
            }
            break;

          case 'update':
            // Content changed in webview, update document
            // The markdown serializer uses originalSrc, so paths are already relative
            const content = message.payload.content;
            // Only update if content is actually different
            if (content !== lastKnownContent) {
              pendingWebviewUpdate = true;
              lastKnownContent = content;
              lastWebviewContent = content; // Track what webview sent
              await this.updateDocument(document, content);
              // Small delay to let the document change event pass
              setTimeout(() => {
                pendingWebviewUpdate = false;
              }, 100); // Increased from 50ms to 100ms for safer timing
            }
            break;

          case 'requestTemplates':
            // Send current templates to webview
            const templates = this.templateManager.getTemplates();
            const templatesMessage: ExtensionToWebviewMessage = {
              type: 'templates',
              payload: { templates },
            };
            webviewPanel.webview.postMessage(templatesMessage);
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

          case 'copyToClipboard':
            // Webview is requesting to copy text to clipboard
            try {
              if (message.payload?.text) {
                await vscode.env.clipboard.writeText(message.payload.text);
              }
            } catch (err) {
              console.error('Failed to write to clipboard:', err);
            }
            break;

          case 'requestImageUrl':
            // Webview is requesting conversion of a relative path to webview URL
            try {
              const imagePath = message.payload?.path;
              if (imagePath && !imagePath.startsWith('http') && !imagePath.includes('vscode-resource')) {
                const imageUri = vscode.Uri.joinPath(documentDir, imagePath);
                const webviewUrl = webviewPanel.webview.asWebviewUri(imageUri).toString();
                webviewPanel.webview.postMessage({
                  type: 'imageUrl',
                  payload: { originalPath: imagePath, webviewUrl },
                });
              }
            } catch (err) {
              console.error('Failed to convert image path:', err);
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

    // Listen for template changes and notify webview
    const templateChangeSubscription = this.templateManager.onTemplatesChange(
      (templates) => {
        const templatesMessage: ExtensionToWebviewMessage = {
          type: 'templates',
          payload: { templates },
        };
        webviewPanel.webview.postMessage(templatesMessage);
      }
    );

    // Cleanup on dispose
    webviewPanel.onDidDispose(() => {
      messageHandler.dispose();
      changeDocumentSubscription.dispose();
      templateChangeSubscription.dispose();
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
