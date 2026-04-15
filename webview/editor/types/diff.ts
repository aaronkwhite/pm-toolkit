/**
 * Shared diff types for the webview side.
 * Mirrors src/diff/diffComputation.ts — kept separate because the webview
 * cannot import from src/ (different build target).
 */

export type DiffRegionType = 'added' | 'removed' | 'changed';

export interface DiffRegion {
  id: string;
  type: DiffRegionType;
  fromPos: number;
  toPos: number;
  oldText: string;
  newText: string;
}
