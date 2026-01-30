/**
 * Drag and Drop Manager for Kanban Board
 *
 * Uses @dnd-kit/dom for vanilla JavaScript drag-drop
 */

import { DragDropManager, Draggable, Droppable } from '@dnd-kit/dom';
import type { KanbanBoard } from './parser';

export interface DragEndEvent {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  toIndex: number;
}

export type OnDragEndCallback = (event: DragEndEvent) => void;

/**
 * Manages drag-and-drop for the kanban board
 */
export class KanbanDragDrop {
  private manager: DragDropManager;
  private draggables: Map<string, Draggable> = new Map();
  private droppables: Map<string, Droppable> = new Map();
  private onDragEnd: OnDragEndCallback;
  private dropIndicator: HTMLElement | null = null;

  constructor(onDragEnd: OnDragEndCallback) {
    this.onDragEnd = onDragEnd;
    this.manager = new DragDropManager();

    // Create drop indicator element
    this.createDropIndicator();

    // Track drag movement to show drop indicator
    this.manager.monitor.addEventListener('dragmove', (event) => {
      const { source, target } = event.operation;
      if (!source || !target) {
        this.hideDropIndicator();
        return;
      }
      this.updateDropIndicator(target.id as string, event.operation.position?.current?.y || 0);
    });

    // Hide indicator when drag starts (will show on dragmove over target)
    this.manager.monitor.addEventListener('dragstart', () => {
      this.hideDropIndicator();
    });

    // Set up drag end listener
    this.manager.monitor.addEventListener('dragend', (event) => {
      this.hideDropIndicator();
      const { source, target } = event.operation;

      if (!source || !target) {
        return;
      }

      const cardId = source.id as string;
      const fromColumnId = source.data?.columnId as string;
      const toColumnId = target.id as string;

      // Calculate the drop index based on the position
      const targetColumn = document.querySelector(`[data-column-id="${toColumnId}"]`);
      const cards = targetColumn?.querySelectorAll('.kanban-card') || [];
      let toIndex = cards.length;

      // Find the index where the card should be inserted
      const dropY = event.operation.position?.current?.y || 0;
      for (let i = 0; i < cards.length; i++) {
        const cardRect = cards[i].getBoundingClientRect();
        const cardMiddle = cardRect.top + cardRect.height / 2;
        if (dropY < cardMiddle) {
          toIndex = i;
          break;
        }
      }

      this.onDragEnd({
        cardId,
        fromColumnId,
        toColumnId,
        toIndex,
      });
    });
  }

  /**
   * Register a card as draggable
   */
  registerCard(element: HTMLElement, cardId: string, columnId: string): void {
    // Clean up existing if present
    this.unregisterCard(cardId);

    const draggable = new Draggable(
      {
        id: cardId,
        element,
        data: { columnId },
      },
      this.manager
    );

    this.draggables.set(cardId, draggable);
  }

  /**
   * Unregister a card
   */
  unregisterCard(cardId: string): void {
    const existing = this.draggables.get(cardId);
    if (existing) {
      existing.destroy();
      this.draggables.delete(cardId);
    }
  }

  /**
   * Register a column as a drop target
   */
  registerColumn(element: HTMLElement, columnId: string): void {
    // Clean up existing if present
    this.unregisterColumn(columnId);

    const droppable = new Droppable(
      {
        id: columnId,
        element,
      },
      this.manager
    );

    this.droppables.set(columnId, droppable);
  }

  /**
   * Unregister a column
   */
  unregisterColumn(columnId: string): void {
    const existing = this.droppables.get(columnId);
    if (existing) {
      existing.destroy();
      this.droppables.delete(columnId);
    }
  }

  /**
   * Create the drop indicator element
   */
  private createDropIndicator(): void {
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'drop-indicator';
    this.dropIndicator.style.display = 'none';
    document.body.appendChild(this.dropIndicator);
  }

  /**
   * Update drop indicator position
   */
  private updateDropIndicator(columnId: string, y: number): void {
    if (!this.dropIndicator) return;

    const columnEl = document.querySelector(`[data-column-id="${columnId}"]`);
    const cardsContainer = columnEl?.querySelector('.column-cards');
    if (!cardsContainer) {
      this.hideDropIndicator();
      return;
    }

    const cards = cardsContainer.querySelectorAll('.kanban-card');
    const containerRect = cardsContainer.getBoundingClientRect();

    let insertY = containerRect.top + 4; // Default to top with small padding

    // Find insertion point
    for (let i = 0; i < cards.length; i++) {
      const cardRect = cards[i].getBoundingClientRect();
      const cardMiddle = cardRect.top + cardRect.height / 2;
      if (y < cardMiddle) {
        insertY = cardRect.top - 4;
        break;
      }
      insertY = cardRect.bottom + 4;
    }

    // Position indicator
    this.dropIndicator.style.display = 'block';
    this.dropIndicator.style.position = 'fixed';
    this.dropIndicator.style.left = `${containerRect.left}px`;
    this.dropIndicator.style.top = `${insertY}px`;
    this.dropIndicator.style.width = `${containerRect.width}px`;
  }

  /**
   * Hide the drop indicator
   */
  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = 'none';
    }
  }

  /**
   * Clean up all registrations
   */
  destroy(): void {
    for (const draggable of this.draggables.values()) {
      draggable.destroy();
    }
    this.draggables.clear();

    for (const droppable of this.droppables.values()) {
      droppable.destroy();
    }
    this.droppables.clear();

    this.hideDropIndicator();
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }

    this.manager.destroy();
  }
}
