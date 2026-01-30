/**
 * Card Detail Modal
 *
 * Linear-style modal for editing card title and description
 * Uses Tiptap for rich markdown editing
 */

import type { Editor } from '@tiptap/core';
import type { KanbanCard } from './parser';
import { createCardEditor } from './tiptap-editor';

export interface CardModalCallbacks {
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onClose: () => void;
}

let activeModal: CardModal | null = null;

/**
 * Card detail modal component
 */
class CardModal {
  private overlayEl: HTMLElement;
  private modalEl: HTMLElement;
  private card: KanbanCard;
  private callbacks: CardModalCallbacks;
  private boundHandleKeydown: (e: KeyboardEvent) => void;
  private editor: Editor | null = null;
  private pendingDescription: string | null = null;

  constructor(card: KanbanCard, callbacks: CardModalCallbacks) {
    this.card = card;
    this.callbacks = callbacks;
    this.boundHandleKeydown = this.handleKeydown.bind(this);

    // Create overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'card-modal-overlay';
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.close();
      }
    });

    // Create modal
    this.modalEl = document.createElement('div');
    this.modalEl.className = 'card-modal';
    this.modalEl.addEventListener('click', (e) => e.stopPropagation());

    this.render();
    this.overlayEl.appendChild(this.modalEl);
  }

  private render(): void {
    this.modalEl.innerHTML = '';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'card-modal-close';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.close());
    this.modalEl.appendChild(closeBtn);

    // Title section
    const titleSection = document.createElement('div');
    titleSection.className = 'card-modal-title-section';

    const titleEl = document.createElement('h2');
    titleEl.className = 'card-modal-title';
    titleEl.textContent = this.card.text || 'Untitled';
    titleEl.addEventListener('click', () => this.editTitle(titleEl));
    titleSection.appendChild(titleEl);

    this.modalEl.appendChild(titleSection);

    // Description section with Tiptap editor
    const descSection = document.createElement('div');
    descSection.className = 'card-modal-desc-section';

    const editorContainer = document.createElement('div');
    editorContainer.className = 'card-modal-editor-container';
    descSection.appendChild(editorContainer);

    this.modalEl.appendChild(descSection);

    // Initialize Tiptap editor after DOM is ready
    requestAnimationFrame(() => {
      this.initEditor(editorContainer);
    });
  }

  private initEditor(container: HTMLElement): void {
    // Destroy existing editor if any
    if (this.editor) {
      this.editor.destroy();
    }

    this.editor = createCardEditor({
      element: container,
      content: this.card.description || '',
      placeholder: 'Add a description...',
      onUpdate: (markdown) => {
        this.pendingDescription = markdown;
      },
    });
  }

  private editTitle(titleEl: HTMLElement): void {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'card-modal-title-input';
    input.value = this.card.text;

    titleEl.replaceWith(input);
    input.focus();
    input.select();

    const save = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== this.card.text) {
        this.card.text = newTitle;
        this.callbacks.onTitleChange(newTitle);
      }
      // Re-render just the title, not the whole modal (preserve editor state)
      const titleSection = this.modalEl.querySelector('.card-modal-title-section');
      if (titleSection) {
        const newTitleEl = document.createElement('h2');
        newTitleEl.className = 'card-modal-title';
        newTitleEl.textContent = this.card.text || 'Untitled';
        newTitleEl.addEventListener('click', () => this.editTitle(newTitleEl));
        input.replaceWith(newTitleEl);
      }
    };

    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      } else if (e.key === 'Escape') {
        // Restore original title without saving
        const titleSection = this.modalEl.querySelector('.card-modal-title-section');
        if (titleSection) {
          const newTitleEl = document.createElement('h2');
          newTitleEl.className = 'card-modal-title';
          newTitleEl.textContent = this.card.text || 'Untitled';
          newTitleEl.addEventListener('click', () => this.editTitle(newTitleEl));
          input.replaceWith(newTitleEl);
        }
      }
    });
  }

  private saveDescription(): void {
    if (this.pendingDescription !== null && this.pendingDescription !== this.card.description) {
      this.card.description = this.pendingDescription;
      this.callbacks.onDescriptionChange(this.pendingDescription);
    }
  }

  show(): void {
    document.body.appendChild(this.overlayEl);
    document.addEventListener('keydown', this.boundHandleKeydown);

    // Animate in
    requestAnimationFrame(() => {
      this.overlayEl.classList.add('visible');
    });
  }

  close(): void {
    // Save any pending description changes
    this.saveDescription();

    // Destroy editor
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }

    this.overlayEl.classList.remove('visible');
    document.removeEventListener('keydown', this.boundHandleKeydown);

    // Wait for animation
    setTimeout(() => {
      this.overlayEl.remove();
      this.callbacks.onClose();
    }, 150);
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      // Only close if not editing title
      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.classList.contains('card-modal-title-input')) {
        // If editor is focused, first blur it, then close on second Escape
        if (this.editor?.isFocused) {
          this.editor.commands.blur();
        } else {
          this.close();
        }
      }
    }
  }
}

/**
 * Open the card detail modal
 */
export function openCardModal(card: KanbanCard, callbacks: CardModalCallbacks): void {
  // Close any existing modal
  if (activeModal) {
    activeModal.close();
  }

  activeModal = new CardModal(card, {
    ...callbacks,
    onClose: () => {
      activeModal = null;
      callbacks.onClose();
    },
  });
  activeModal.show();
}

/**
 * Close the active modal if open
 */
export function closeCardModal(): void {
  if (activeModal) {
    activeModal.close();
    activeModal = null;
  }
}
