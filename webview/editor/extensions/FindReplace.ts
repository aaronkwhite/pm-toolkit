/**
 * Find & Replace Extension
 *
 * ProseMirror plugin that implements case-insensitive find/replace with
 * inline highlight decorations for all matches and a distinct highlight for
 * the active match.  All state lives in the plugin so React only reads it —
 * the source of truth is never split between component state and plugin state.
 *
 * CSS classes applied by this extension:
 *   .pm-find-match          — every match
 *   .pm-find-match-active   — the currently selected match
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

export interface FindReplaceState {
  query: string;
  matches: { from: number; to: number }[];
  activeIndex: number;
  isOpen: boolean;
  showReplace: boolean;
}

const findReplaceKey = new PluginKey<FindReplaceState>('findReplace');

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    findReplace: {
      /** Open the find bar (no replace row). */
      openFind: () => ReturnType;
      /** Open the find bar with the replace row visible. */
      openFindReplace: () => ReturnType;
      /** Update the search query and recompute matches. */
      setFindQuery: (query: string) => ReturnType;
      /** Advance to the next match and scroll it into view. */
      findNext: () => ReturnType;
      /** Go back to the previous match and scroll it into view. */
      findPrev: () => ReturnType;
      /** Replace the currently active match with the given string. */
      replaceCurrent: (replacement: string) => ReturnType;
      /** Replace every match in the document with the given string. */
      replaceAll: (replacement: string) => ReturnType;
      /** Close the find bar and clear all match state. */
      closeFind: () => ReturnType;
    };
  }
}

function findMatches(doc: ProseMirrorNode, query: string): { from: number; to: number }[] {
  if (!query) return [];
  const matches: { from: number; to: number }[] = [];
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  doc.descendants((node: ProseMirrorNode, pos: number) => {
    if (!node.isText) return;
    let m;
    while ((m = regex.exec(node.text!)) !== null) {
      matches.push({ from: pos + m.index, to: pos + m.index + m[0].length });
    }
  });
  return matches;
}

export const FindReplace = Extension.create({
  name: 'findReplace',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: findReplaceKey,

        state: {
          init(): FindReplaceState {
            return {
              query: '',
              matches: [],
              activeIndex: 0,
              isOpen: false,
              showReplace: false,
            };
          },

          apply(tr, pluginState, _oldState, newState): FindReplaceState {
            const meta = tr.getMeta(findReplaceKey);
            if (meta) {
              const next = { ...pluginState, ...meta };
              // Recompute matches if query changed via meta
              if (meta.query !== undefined && meta.query !== pluginState.query) {
                next.matches = findMatches(newState.doc, meta.query);
                next.activeIndex = 0;
              }
              return next;
            }

            // Only recompute when the doc changed AND the meta did not already
            // supply fresh matches (e.g. replaceCurrent computes its own matches
            // on the post-replace doc and passes them via meta above).
            if (tr.docChanged && pluginState.query) {
              return {
                ...pluginState,
                matches: findMatches(newState.doc, pluginState.query),
              };
            }

            return pluginState;
          },
        },

        props: {
          decorations(state) {
            const pluginState = findReplaceKey.getState(state);
            if (!pluginState || !pluginState.query || pluginState.matches.length === 0) {
              return DecorationSet.empty;
            }

            const decorations = pluginState.matches.map((match, i) => {
              const isActive = i === pluginState.activeIndex;
              return Decoration.inline(match.from, match.to, {
                class: isActive ? 'pm-find-match pm-find-match-active' : 'pm-find-match',
              });
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      openFind:
        () =>
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(findReplaceKey, { isOpen: true, showReplace: false });
            dispatch(tr);
          }
          return true;
        },

      openFindReplace:
        () =>
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(findReplaceKey, { isOpen: true, showReplace: true });
            dispatch(tr);
          }
          return true;
        },

      setFindQuery:
        (query: string) =>
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(findReplaceKey, { query, activeIndex: 0 });
            dispatch(tr);
          }
          return true;
        },

      findNext:
        () =>
        ({ dispatch, tr, state }: any) => {
          const pluginState = findReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;

          const nextIndex = (pluginState.activeIndex + 1) % pluginState.matches.length;
          if (dispatch) {
            const match = pluginState.matches[nextIndex];
            tr.setMeta(findReplaceKey, { activeIndex: nextIndex });
            if (match) {
              // Move the ProseMirror selection to the match so that
              // scrollIntoView() brings it into the visible viewport.
              tr.setSelection(TextSelection.create(state.doc, match.from, match.to));
              tr.scrollIntoView();
            }
            dispatch(tr);
          }
          return true;
        },

      findPrev:
        () =>
        ({ dispatch, tr, state }: any) => {
          const pluginState = findReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;

          const prevIndex =
            (pluginState.activeIndex - 1 + pluginState.matches.length) %
            pluginState.matches.length;
          if (dispatch) {
            const match = pluginState.matches[prevIndex];
            tr.setMeta(findReplaceKey, { activeIndex: prevIndex });
            if (match) {
              tr.setSelection(TextSelection.create(state.doc, match.from, match.to));
              tr.scrollIntoView();
            }
            dispatch(tr);
          }
          return true;
        },

      replaceCurrent:
        (replacement: string) =>
        ({ dispatch, tr, state }: any) => {
          const pluginState = findReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;

          const match = pluginState.matches[pluginState.activeIndex];
          if (!match) return false;

          if (dispatch) {
            if (replacement === '') {
              tr.delete(match.from, match.to);
            } else {
              tr.replaceWith(match.from, match.to, state.schema.text(replacement));
            }
            // After replace, recompute matches
            const newMatches = findMatches(tr.doc, pluginState.query);
            const newActiveIndex = Math.min(pluginState.activeIndex, Math.max(0, newMatches.length - 1));
            tr.setMeta(findReplaceKey, {
              matches: newMatches,
              activeIndex: newActiveIndex,
            });
            dispatch(tr);
          }
          return true;
        },

      replaceAll:
        (replacement: string) =>
        ({ dispatch, tr, state }: any) => {
          const pluginState = findReplaceKey.getState(state);
          if (!pluginState || pluginState.matches.length === 0) return false;

          if (dispatch) {
            // Replace from end to start to preserve positions
            const matches = [...pluginState.matches].reverse();
            for (const match of matches) {
              if (replacement === '') {
                tr.delete(match.from, match.to);
              } else {
                tr.replaceWith(match.from, match.to, state.schema.text(replacement));
              }
            }
            tr.setMeta(findReplaceKey, { matches: [], activeIndex: 0 });
            dispatch(tr);
          }
          return true;
        },

      closeFind:
        () =>
        ({ dispatch, tr }: any) => {
          if (dispatch) {
            tr.setMeta(findReplaceKey, {
              isOpen: false,
              query: '',
              matches: [],
              activeIndex: 0,
            });
            dispatch(tr);
          }
          return true;
        },
    };
  },
});

export { findReplaceKey };
