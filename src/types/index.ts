/**
 * Messages sent from Extension to Webview
 */
export type ExtensionToWebviewMessage =
  | { type: 'init'; payload: { content: string; filename: string } }
  | { type: 'update'; payload: { content: string } }
  | { type: 'templates'; payload: { templates: Template[] } }
  | { type: 'clipboardData'; payload: { text: string } };

/**
 * Messages sent from Webview to Extension
 */
export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'update'; payload: { content: string } }
  | { type: 'requestTemplates' }
  | { type: 'requestClipboard' };

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
