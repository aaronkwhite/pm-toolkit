/**
 * Template Manager
 *
 * Manages loading and caching of markdown templates with YAML frontmatter
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Template } from '../types';

// Lazy load gray-matter to avoid blocking extension startup
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _matter: any = null;
function getMatter() {
  if (!_matter) {
    _matter = require('gray-matter');
  }
  return _matter as typeof import('gray-matter');
}

/**
 * Callback type for template change notifications
 */
export type TemplateChangeCallback = (templates: Template[]) => void;

/**
 * TemplateManager - Singleton for managing markdown templates
 */
export class TemplateManager {
  private static instance: TemplateManager | null = null;

  private templates: Template[] = [];
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private configDisposable: vscode.Disposable | null = null;
  private changeCallbacks: Set<TemplateChangeCallback> = new Set();

  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): TemplateManager {
    if (!TemplateManager.instance) {
      TemplateManager.instance = new TemplateManager();
    }
    return TemplateManager.instance;
  }

  /**
   * Initialize the template manager
   */
  public async initialize(): Promise<void> {
    // Load templates initially
    await this.loadTemplates();

    // Watch for configuration changes
    this.configDisposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('pmtoolkit.templateFolder') ||
        e.affectsConfiguration('pmtoolkit.templateWatchEnabled')
      ) {
        this.setupFileWatcher();
        this.loadTemplates();
      }
    });

    // Set up file watcher
    this.setupFileWatcher();
  }

  /**
   * Set up the file system watcher for the template folder
   */
  private setupFileWatcher(): void {
    // Dispose existing watcher
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }

    const config = vscode.workspace.getConfiguration('pmtoolkit');
    const watchEnabled = config.get<boolean>('templateWatchEnabled', true);
    const templateFolder = config.get<string>('templateFolder', '');

    if (!watchEnabled || !templateFolder) {
      return;
    }

    // Resolve the template folder path
    const folderPath = this.resolveTemplatePath(templateFolder);
    if (!folderPath) {
      return;
    }

    // Watch for markdown files in the template folder
    const pattern = new vscode.RelativePattern(folderPath, '*.md');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

    // Reload templates on any file change
    this.fileWatcher.onDidCreate(() => this.loadTemplates());
    this.fileWatcher.onDidChange(() => this.loadTemplates());
    this.fileWatcher.onDidDelete(() => this.loadTemplates());
  }

  /**
   * Resolve template folder path (supports workspace-relative paths)
   */
  private resolveTemplatePath(templateFolder: string): string | null {
    if (!templateFolder) {
      return null;
    }

    // If it's an absolute path, use it directly
    if (path.isAbsolute(templateFolder)) {
      return templateFolder;
    }

    // Otherwise, resolve relative to workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return null;
    }

    return path.join(workspaceFolders[0].uri.fsPath, templateFolder);
  }

  /**
   * Load all templates from the configured folder
   */
  public async loadTemplates(): Promise<void> {
    const config = vscode.workspace.getConfiguration('pmtoolkit');
    const templateFolder = config.get<string>('templateFolder', '');

    if (!templateFolder) {
      this.templates = [];
      this.notifyChange();
      return;
    }

    const folderPath = this.resolveTemplatePath(templateFolder);
    if (!folderPath) {
      this.templates = [];
      this.notifyChange();
      return;
    }

    try {
      const folderUri = vscode.Uri.file(folderPath);
      const entries = await vscode.workspace.fs.readDirectory(folderUri);

      const templates: Template[] = [];

      for (const [name, type] of entries) {
        if (type === vscode.FileType.File && name.endsWith('.md')) {
          const template = await this.parseTemplateFile(folderUri, name);
          if (template) {
            templates.push(template);
          }
        }
      }

      // Sort templates alphabetically by name
      templates.sort((a, b) => a.name.localeCompare(b.name));

      this.templates = templates;
      this.notifyChange();
    } catch (err) {
      console.error('Failed to load templates:', err);
      this.templates = [];
      this.notifyChange();
    }
  }

  /**
   * Parse a single template file
   */
  private async parseTemplateFile(
    folderUri: vscode.Uri,
    filename: string
  ): Promise<Template | null> {
    try {
      const fileUri = vscode.Uri.joinPath(folderUri, filename);
      const content = await vscode.workspace.fs.readFile(fileUri);
      const text = Buffer.from(content).toString('utf-8');

      // Parse YAML frontmatter
      const matter = getMatter();
      const { data, content: body } = matter(text);

      // Generate ID from filename (without extension)
      const id = path.basename(filename, '.md');

      // Extract template metadata from frontmatter
      const template: Template = {
        id,
        name: data.template_name || this.formatName(id),
        description: data.template_description || '',
        icon: data.template_icon,
        content: body.trim(),
      };

      return template;
    } catch (err) {
      console.error(`Failed to parse template file ${filename}:`, err);
      return null;
    }
  }

  /**
   * Format a filename into a readable name
   * e.g., "meeting-notes" -> "Meeting Notes"
   */
  private formatName(filename: string): string {
    return filename
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Get all loaded templates
   */
  public getTemplates(): Template[] {
    return this.templates;
  }

  /**
   * Register a callback for template changes
   */
  public onTemplatesChange(callback: TemplateChangeCallback): vscode.Disposable {
    this.changeCallbacks.add(callback);
    return new vscode.Disposable(() => {
      this.changeCallbacks.delete(callback);
    });
  }

  /**
   * Notify all listeners of template changes
   */
  private notifyChange(): void {
    for (const callback of this.changeCallbacks) {
      try {
        callback(this.templates);
      } catch (err) {
        console.error('Error in template change callback:', err);
      }
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }
    if (this.configDisposable) {
      this.configDisposable.dispose();
      this.configDisposable = null;
    }
    this.changeCallbacks.clear();
    this.templates = [];
    TemplateManager.instance = null;
  }
}
