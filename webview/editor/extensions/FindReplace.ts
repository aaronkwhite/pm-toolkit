import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface FindReplaceState {
  query: string;
  matches: { from: number; to: number }[];
  activeIndex: number;
  isOpen: boolean;
  showReplace: boolean;
}

const findReplaceKey = new PluginKey<FindReplaceState>('findReplace');

function findMatches(doc: any, query: string): { from: number; to: number }[] {
  if (!query) return [];
  const matches: { from: number; to: number }[] = [];
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;
    let m;
    while ((m = regex.exec(node.text)) !== null) {
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
            tr.setMeta(findReplaceKey, { activeIndex: nextIndex });
            dispatch(tr);

            // Scroll active match into view
            const match = pluginState.matches[nextIndex];
            if (match) {
              const newTr = state.tr.setSelection(
                TextSelection.create(state.doc, match.from, match.to)
              );
              // We only want to scroll, not actually change selection in a way that breaks things
              // Use the view's scrollIntoView after dispatch
              setTimeout(() => {
                const view = (this as any).editor?.view;
                if (view) {
                  view.dispatch(view.state.tr.scrollIntoView());
                }
              }, 0);
            }
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
            tr.setMeta(findReplaceKey, { activeIndex: prevIndex });
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
            tr.replaceWith(match.from, match.to, state.schema.text(replacement));
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
              tr.replaceWith(match.from, match.to, state.schema.text(replacement));
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
