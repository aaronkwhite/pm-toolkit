/**
 * AiDiff Extension
 *
 * ProseMirror plugin that renders diff decorations when an AI tool
 * (Cursor, Windsurf, Claude Code, etc.) edits the file on disk.
 *
 * Decoration strategy:
 *   added   → Decoration.inline with class pm-diff-added
 *   changed → Decoration.inline with class pm-diff-changed
 *   removed → Decoration.widget (zero-width) with a strike-through span
 *
 * Commands:
 *   showDiff(regions, mode) — apply decorations
 *   clearDiff()             — remove all decorations
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';
import type { DiffRegion } from '../types/diff';

export type { DiffRegion };

interface AiDiffPluginState {
  regions: DiffRegion[];
  mode: string;
}

export const aiDiffKey = new PluginKey<AiDiffPluginState>('aiDiff');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiDiff: {
      /** Apply diff decorations from the given regions. */
      showDiff: (regions: DiffRegion[], mode: string) => ReturnType;
      /** Remove all diff decorations. */
      clearDiff: () => ReturnType;
    };
  }
}

/**
 * Maps a character offset within the plain text content of a ProseMirror doc
 * to a ProseMirror position.
 *
 * doc.textContent gives the concatenated text of all leaf nodes (no node boundaries).
 * But PM positions count node-open and node-close tokens too.
 *
 * Strategy: walk the doc using doc.nodesBetween, accumulating text length,
 * until we've consumed `targetOffset` text characters — then return the PM pos.
 */
function textOffsetToPmPos(doc: Node, targetOffset: number): number {
  let textConsumed = 0;
  let result = 0;

  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (textConsumed >= targetOffset) return false; // already found it
    if (node.isText) {
      const text = node.text!;
      if (textConsumed + text.length >= targetOffset) {
        result = pos + (targetOffset - textConsumed);
        textConsumed = targetOffset;
        return false;
      }
      textConsumed += text.length;
    }
    return true;
  });

  return result;
}

function createRemovedWidget(oldText: string): HTMLElement {
  const span = document.createElement('span');
  span.className = 'pm-diff-removed';
  span.textContent = oldText;
  return span;
}

export const AiDiff = Extension.create({
  name: 'aiDiff',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiDiffKey,

        state: {
          init(): AiDiffPluginState {
            return { regions: [], mode: 'off' };
          },

          apply(tr, pluginState): AiDiffPluginState {
            const meta = tr.getMeta(aiDiffKey);
            if (meta) {
              return { ...pluginState, ...meta };
            }
            return pluginState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = aiDiffKey.getState(state);
            if (!pluginState || pluginState.regions.length === 0) {
              return DecorationSet.empty;
            }

            const { regions } = pluginState;
            const decorations: Decoration[] = [];
            const docSize = state.doc.content.size;

            for (const region of regions) {
              const from = Math.max(0, Math.min(region.fromPos, docSize));
              const to = Math.max(from, Math.min(region.toPos, docSize));

              if (region.type === 'added') {
                if (from < to) {
                  decorations.push(
                    Decoration.inline(from, to, { class: 'pm-diff-added' })
                  );
                }
              } else if (region.type === 'changed') {
                if (from < to) {
                  decorations.push(
                    Decoration.inline(from, to, { class: 'pm-diff-changed' })
                  );
                }
              } else if (region.type === 'removed') {
                const pos = Math.min(from, docSize);
                decorations.push(
                  Decoration.widget(pos, () => createRemovedWidget(region.oldText), {
                    key: region.id,
                  })
                );
              }
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      showDiff:
        (regions: DiffRegion[], mode: string) =>
        ({ dispatch, tr, editor }: any) => {
          if (dispatch) {
            const doc = editor.state.doc;
            const remapped = regions.map((r: DiffRegion) => ({
              ...r,
              fromPos: textOffsetToPmPos(doc, r.fromPos),
              toPos: textOffsetToPmPos(doc, r.toPos),
            }));
            tr.setMeta(aiDiffKey, { regions: remapped, mode });
            dispatch(tr);
          }
          return true;
        },

      clearDiff:
        () =>
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(aiDiffKey, { regions: [], mode: 'off' });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
