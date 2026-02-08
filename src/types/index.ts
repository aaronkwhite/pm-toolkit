/**
 * File info for link picker
 */
export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
}

/**
 * Messages sent from Extension to Webview
 */
export type ExtensionToWebviewMessage =
  | { type: 'init'; payload: { content: string; filename: string } }
  | { type: 'update'; payload: { content: string } }
  | { type: 'templates'; payload: { templates: Template[] } }
  | { type: 'clipboardData'; payload: { text: string } }
  | { type: 'imageUrl'; payload: { originalPath: string; webviewUrl: string } }
  | { type: 'imageSaved'; payload: { originalPath: string; webviewUrl: string } }
  | { type: 'filePickerResult'; payload: { originalPath: string; webviewUrl: string } }
  | { type: 'files'; payload: { files: FileInfo[]; currentFilePath: string } };

/**
 * Messages sent from Webview to Extension
 */
export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'update'; payload: { content: string } }
  | { type: 'requestTemplates' }
  | { type: 'requestClipboard' }
  | { type: 'copyToClipboard'; payload: { text: string } }
  | { type: 'requestImageUrl'; payload: { path: string } }
  | { type: 'saveImage'; payload: { filename: string; data: string } }
  | { type: 'requestFilePicker' }
  | { type: 'requestFiles'; payload: { search?: string } }
  | { type: 'openFile'; payload: { path: string } };

/**
 * Template definition from YAML frontmatter
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  icon?: string;
  content: string;
}

/**
 * Kanban board data structures
 */
export interface KanbanBoard {
  columns: KanbanColumn[];
  preamble: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanCard {
  id: string;
  title: string;
  description: string[];
  completed: boolean;
}
