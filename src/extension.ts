import * as vscode from 'vscode';
import { MarkdownEditorProvider } from './editors/MarkdownEditorProvider';
import { KanbanEditorProvider } from './editors/KanbanEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('PM Toolkit is now active');

  // Register custom editor providers
  context.subscriptions.push(MarkdownEditorProvider.register(context));
  context.subscriptions.push(KanbanEditorProvider.register(context));

  // TODO: Register viewer providers (PDF, Word, Excel, CSV)

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
}

export function deactivate() {
  // Cleanup if needed
}
