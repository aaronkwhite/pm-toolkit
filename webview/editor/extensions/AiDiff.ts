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
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(aiDiffKey, { regions, mode });
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
