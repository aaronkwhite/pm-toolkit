import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './editors/MarkdownEditorProvider';
import { KanbanEditorProvider } from './editors/KanbanEditorProvider';
import {
  PDFViewerProvider,
  DocxViewerProvider,
  ExcelViewerProvider,
  CSVViewerProvider,
} from './viewers';

export function activate(context: vscode.ExtensionContext) {
  console.log('PM Toolkit is now active');

  // Auto-save dirty kanban files on window focus to prevent Cursor diff state issues
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(async (e) => {
      if (e.focused) {
        // Save all dirty kanban files when window regains focus
        for (const doc of vscode.workspace.textDocuments) {
          if (doc.fileName.endsWith('.kanban') && doc.isDirty) {
            try {
              await doc.save();
            } catch (err) {
              console.error('Failed to auto-save kanban file:', err);
            }
          }
        }
      }
    })
  );

  // Also try to save dirty kanban files when extension activates
  (async () => {
    for (const doc of vscode.workspace.textDocuments) {
      if (doc.fileName.endsWith('.kanban') && doc.isDirty) {
        try {
          await doc.save();
        } catch (err) {
          // If save fails, show a warning
          vscode.window.showWarningMessage(
            `Kanban file "${doc.fileName}" has pending changes. Please save or discard them to open the board.`
          );
        }
      }
    }
  })();

  // Register custom editor providers
  context.subscriptions.push(MarkdownEditorProvider.register(context));
  context.subscriptions.push(KanbanEditorProvider.register(context));

  // Register viewer providers
  context.subscriptions.push(PDFViewerProvider.register(context));
  context.subscriptions.push(DocxViewerProvider.register(context));
  context.subscriptions.push(ExcelViewerProvider.register(context));
  context.subscriptions.push(CSVViewerProvider.register(context));

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('pmtoolkit.newKanbanBoard', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showErrorMessage('Please open a folder first');
        return;
      }

      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter a name for your Kanban board',
        placeHolder: 'my-board',
        validateInput: (value) => {
          if (!value) return 'Name is required';
          if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            return 'Use only letters, numbers, hyphens, and underscores';
          }
          return null;
        },
      });

      if (!fileName) return;

      const fileUri = vscode.Uri.joinPath(
        workspaceFolders[0].uri,
        `${fileName}.kanban`
      );

      const defaultContent = `## Backlog

- [ ] First task
- [ ] Second task

## In Progress

## Done

`;

      await vscode.workspace.fs.writeFile(
        fileUri,
        Buffer.from(defaultContent, 'utf-8')
      );

      await vscode.commands.executeCommand('vscode.openWith', fileUri, KanbanEditorProvider.viewType);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pmtoolkit.openAsKanban', async (uri: vscode.Uri) => {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        uri,
        KanbanEditorProvider.viewType
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pmtoolkit.openWithPMToolkit', async (uri: vscode.Uri) => {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        uri,
        MarkdownEditorProvider.viewType
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('pmtoolkit.toggleKanbanThumbnails', async () => {
      await KanbanEditorProvider.toggleThumbnails();
    })
  );
}

export function deactivate() {
  // Cleanup if needed
}
