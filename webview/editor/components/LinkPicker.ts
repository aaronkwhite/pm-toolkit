/**
 * Link Picker Component
 *
 * Two-mode picker for inserting links:
 * 1. File picker - search and select workspace files
 * 2. URL form - enter URL and display text
 */

/**
 * Simple path utilities for browser environment
 */
function pathDirname(p: string): string {
  const normalized = p.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? '.' : normalized.substring(0, lastSlash);
}

function pathRelative(from: string, to: string): string {
  // Normalize paths to use forward slashes
  const fromParts = from.replace(/\\/g, '/').split('/').filter(Boolean);
  const toParts = to.replace(/\\/g, '/').split('/').filter(Boolean);

  // Find common prefix
  let commonLength = 0;
  while (
    commonLength < fromParts.length &&
    commonLength < toParts.length &&
    fromParts[commonLength] === toParts[commonLength]
  ) {
    commonLength++;
  }

  // Build relative path
  const upCount = fromParts.length - commonLength;
  const relativeParts = [];

  for (let i = 0; i < upCount; i++) {
    relativeParts.push('..');
  }

  for (let i = commonLength; i < toParts.length; i++) {
    relativeParts.push(toParts[i]);
  }

  return relativeParts.join('/') || '.';
}

/**
 * File info from extension
 */
export interface FileInfo {
  name: string;
  path: string;
  relativePath: string;
}

/**
 * Link data returned when a link is selected
 */
export interface LinkData {
  text: string;
  href: string;
}

/**
 * Callback when a link is selected
 */
export type OnLinkSelect = (linkData: LinkData) => void;

/**
 * Link Picker options
 */
export interface LinkPickerOptions {
  rect: DOMRect;
  onSelect: OnLinkSelect;
  onCancel: () => void;
}

/**
 * Get vscode API for messaging
 */
function getVsCodeApi(): { postMessage: (msg: unknown) => void } | null {
  return (window as any).vscode || null;
}

/**
 * Link Picker Component
 */
export class LinkPicker {
  private element: HTMLElement;
  private mode: 'menu' | 'file' | 'url' = 'menu';
  private files: FileInfo[] = [];
  private currentFilePath: string = '';
  private selectedIndex = 0;
  private searchQuery = '';
  private options: LinkPickerOptions | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'link-picker';

    // Only stop propagation in bubbling phase (not capturing)
    // This allows clicks to reach child elements first
    this.element.addEventListener('mousedown', (e) => e.stopPropagation());
    this.element.addEventListener('mouseup', (e) => e.stopPropagation());
    this.element.addEventListener('click', (e) => e.stopPropagation());
    this.element.addEventListener('keydown', (e) => e.stopPropagation());
    this.element.addEventListener('keyup', (e) => e.stopPropagation());

    document.body.appendChild(this.element);

    // Listen for file list from extension
    this.messageHandler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'files') {
        this.files = message.payload.files;
        this.currentFilePath = message.payload.currentFilePath;
        if (this.mode === 'file') {
          this.renderFilePicker();
          this.reposition();
        }
      }
    };
    window.addEventListener('message', this.messageHandler);
  }

  private reposition() {
    if (!this.options) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.position(this.options!.rect);
      });
    });
  }

  show(options: LinkPickerOptions) {
    this.options = options;
    this.mode = 'menu';
    this.selectedIndex = 0;
    this.renderMenu();
    this.element.style.display = 'block';

    // Position after two frames to ensure browser has laid out the element
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.position(options.rect);
      });
    });

    // Prevent mousedown from stealing focus from picker
    this.element.addEventListener('mousedown', this.handleMouseDown);

    // Immediately block Enter key to prevent it creating new list items
    // The slash menu's Enter triggers this command, and the keyup might leak through
    const blockEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener('keydown', blockEnter, true);
    document.addEventListener('keyup', blockEnter, true);

    // Add keyboard and click handlers after a short delay
    // This prevents the Enter key from the slash menu from immediately selecting
    setTimeout(() => {
      document.removeEventListener('keydown', blockEnter, true);
      document.removeEventListener('keyup', blockEnter, true);
      document.addEventListener('keydown', this.handleKeyDown);
      document.addEventListener('mousedown', this.handleClickOutside);
    }, 100);
  }

  private handleClickOutside = (e: MouseEvent) => {
    // Only close if clicking outside the picker
    // Ignore if target is an input (might be editor regaining focus)
    const target = e.target as HTMLElement;
    if (!this.element.contains(target) && target.tagName !== 'INPUT') {
      this.cancel();
    }
  };

  private handleMouseDown = (e: MouseEvent) => {
    // Prevent editor from stealing focus, but allow inputs and buttons to work
    const target = e.target as HTMLElement;
    if (this.element.contains(target)) {
      // Allow inputs and buttons to receive focus/clicks normally
      if (target.tagName !== 'INPUT' && target.tagName !== 'BUTTON' && !target.closest('button')) {
        e.preventDefault();
      }
    }
  };

  private position(rect: DOMRect) {
    // Position below the cursor (same logic as slash command menu)
    const menuRect = this.element.getBoundingClientRect();
    const { innerHeight, innerWidth } = window;

    // Use actual height or fallback to max-height from CSS
    const menuHeight = menuRect.height || 320;
    const menuWidth = menuRect.width || 300;

    let top = rect.bottom + 8;
    let left = rect.left;

    // Flip up if near bottom
    if (top + menuHeight > innerHeight - 20) {
      top = rect.top - menuHeight - 8;
    }

    // Keep within horizontal bounds
    if (left + menuWidth > innerWidth - 20) {
      left = innerWidth - menuWidth - 20;
    }

    this.element.style.top = `${top}px`;
    this.element.style.left = `${left}px`;
  }

  private renderMenu() {
    const menuItems = [
      { icon: '🔗', title: 'Link to file', description: 'Search and link to a document', action: 'file' },
      { icon: '🌐', title: 'Link to URL', description: 'Link to an external URL', action: 'url' },
    ];

    this.element.innerHTML = `
      <div class="link-picker-header">TYPE TO SEARCH</div>
      ${menuItems.map((item, i) => `
        <button
          class="link-picker-item ${i === this.selectedIndex ? 'is-selected' : ''}"
          data-action="${item.action}"
          data-index="${i}"
        >
          <span class="link-picker-icon">${item.icon}</span>
          <div class="link-picker-content">
            <span class="link-picker-title">${item.title}</span>
            <span class="link-picker-description">${item.description}</span>
          </div>
        </button>
      `).join('')}
    `;

    // Add click handlers - use click event, not mouseup
    this.element.querySelectorAll('.link-picker-item').forEach((el) => {
      (el as HTMLElement).onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const action = el.getAttribute('data-action');
        if (action === 'file') {
          this.showFilePicker();
        } else if (action === 'url') {
          this.showUrlForm();
        }
      };
    });
  }

  private showFilePicker() {
    this.mode = 'file';
    this.selectedIndex = 0;
    this.searchQuery = '';

    // Request files from extension
    const vscode = getVsCodeApi();
    if (vscode) {
      vscode.postMessage({ type: 'requestFiles', payload: {} });
    }

    this.renderFilePicker();
    this.reposition();
  }

  private renderFilePicker() {
    const filteredFiles = this.searchQuery
      ? this.files.filter(f => {
          const searchTarget = `${f.name} ${f.relativePath}`.toLowerCase();
          return searchTarget.includes(this.searchQuery.toLowerCase());
        })
      : this.files;

    this.element.innerHTML = `
      <div class="link-picker-search">
        <input
          type="text"
          class="link-picker-search-input"
          placeholder="Search files..."
          value="${this.escapeHtml(this.searchQuery)}"
        />
      </div>
      <div class="link-picker-files">
        ${filteredFiles.length === 0 ? `
          <div class="link-picker-empty">No files found</div>
        ` : filteredFiles.map((file, i) => `
          <button
            class="link-picker-item ${i === this.selectedIndex ? 'is-selected' : ''}"
            data-index="${i}"
          >
            <div class="link-picker-content">
              <span class="link-picker-title">${this.escapeHtml(file.name)}</span>
              <span class="link-picker-description">${this.escapeHtml(file.relativePath)}</span>
            </div>
          </button>
        `).join('')}
      </div>
    `;

    // Auto-focus the search input for keyboard navigation
    // (Editor should be frozen with setEditable(false) so blur is safe)
    const input = this.element.querySelector('.link-picker-search-input') as HTMLInputElement;
    if (input) {
      input.focus();
      input.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        this.selectedIndex = 0;

        // Request filtered files from extension
        const vscode = getVsCodeApi();
        if (vscode) {
          vscode.postMessage({ type: 'requestFiles', payload: { search: this.searchQuery } });
        }
      });
      input.addEventListener('keydown', (e) => {
        // Stop propagation to prevent editor shortcuts (like Cmd+B) from firing
        e.stopPropagation();
        this.handleFilePickerKeyDown(e, filteredFiles);
      });
    }

    // Add click handlers for files
    this.element.querySelectorAll('.link-picker-files .link-picker-item').forEach((el) => {
      el.addEventListener('click', () => {
        const index = parseInt(el.getAttribute('data-index') || '0', 10);
        this.selectFile(filteredFiles[index]);
      });
    });
  }

  private handleFilePickerKeyDown(e: KeyboardEvent, files: FileInfo[]) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, files.length - 1);
      this.renderFilePicker();
      // Re-focus input after render
      const input = this.element.querySelector('.link-picker-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.renderFilePicker();
      const input = this.element.querySelector('.link-picker-search-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (files[this.selectedIndex]) {
        this.selectFile(files[this.selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  private selectFile(file: FileInfo) {
    if (!this.options || !file) return;

    // Calculate relative path from current document to target file
    const currentDir = pathDirname(this.currentFilePath);
    const relativePath = pathRelative(currentDir, file.path);

    this.options.onSelect({ text: file.name, href: relativePath });
    this.destroy();
  }

  private showUrlForm() {
    this.mode = 'url';

    this.element.innerHTML = `
      <div class="link-picker-form">
        <div class="link-picker-form-group">
          <input
            type="text"
            class="link-picker-input"
            id="link-url"
            placeholder="https://..."
          />
        </div>
        <div class="link-picker-form-group">
          <input
            type="text"
            class="link-picker-input"
            id="link-text"
            placeholder="Link text"
          />
        </div>
        <div class="link-picker-form-actions">
          <button class="link-picker-btn link-picker-btn-cancel">Cancel</button>
          <button class="link-picker-btn link-picker-btn-submit">Insert Link</button>
        </div>
      </div>
    `;

    const urlInput = this.element.querySelector('#link-url') as HTMLInputElement;
    const textInput = this.element.querySelector('#link-text') as HTMLInputElement;
    const cancelBtn = this.element.querySelector('.link-picker-btn-cancel');
    const submitBtn = this.element.querySelector('.link-picker-btn-submit');

    // Focus URL input
    urlInput?.focus();

    // Reposition after content change
    this.reposition();

    // Auto-fill display text with URL
    urlInput?.addEventListener('input', () => {
      if (textInput && !textInput.dataset.userEdited) {
        textInput.value = urlInput.value;
      }
    });

    // Track if user manually edited the text field
    textInput?.addEventListener('input', () => {
      if (textInput) {
        textInput.dataset.userEdited = 'true';
      }
    });

    // Handle Enter key
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitUrlForm(urlInput?.value || '', textInput?.value || '');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      }
    };

    urlInput?.addEventListener('keydown', handleEnter);
    textInput?.addEventListener('keydown', handleEnter);

    cancelBtn?.addEventListener('click', () => this.cancel());
    submitBtn?.addEventListener('click', () => {
      this.submitUrlForm(urlInput?.value || '', textInput?.value || '');
    });
  }

  private submitUrlForm(url: string, text: string) {
    if (!this.options || !url) return;

    // Use URL as text if text is empty
    const displayText = text || url;

    this.options.onSelect({ text: displayText, href: url });
    this.destroy();
  }

  private cancel() {
    this.options?.onCancel();
    this.destroy();
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    // Handle Escape in all modes
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.cancel();
      return;
    }

    if (this.mode === 'menu') {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, 1);
        this.renderMenu();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.renderMenu();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (this.selectedIndex === 0) {
          this.showFilePicker();
        } else {
          this.showUrlForm();
        }
      }
    }
    // URL form and file picker handle their own keyboard events via input listeners
  };

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  destroy() {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('mousedown', this.handleClickOutside);
    this.element.removeEventListener('mousedown', this.handleMouseDown);
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
    }
    this.element.remove();
  }
}
