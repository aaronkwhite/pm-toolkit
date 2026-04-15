import { Node, mergeAttributes } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';

/** Convert [[filename]] → <wikilink data-target="filename">filename</wikilink> */
export function preprocessWikiLinksToHtml(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]\n]+)\]\]/g,
    (_match, target) => `<wikilink data-target="${target.replace(/"/g, '&quot;')}">${target}</wikilink>`
  );
}

export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      target: { default: '' },
    };
  },

  parseHTML() {
    return [{
      tag: 'wikilink[data-target]',
      getAttrs: el => ({ target: (el as HTMLElement).dataset.target ?? '' }),
    }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'wikilink',
      mergeAttributes({ 'data-target': HTMLAttributes.target, class: 'pm-wiki-link' }),
      HTMLAttributes.target,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          state.write(`[[${node.attrs.target}]]`);
        },
        parse: {
          updateDOM(_element: HTMLElement) {
            // Handled by preprocessWikiLinksToHtml before setContent
          },
        },
      },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('wikilink');
      dom.dataset.target = node.attrs.target;
      dom.className = 'pm-wiki-link';
      dom.textContent = node.attrs.target;
      dom.style.cssText = 'cursor: pointer; display: inline;';
      dom.addEventListener('click', e => {
        e.preventDefault();
        window.vscode?.postMessage({ type: 'openFile', payload: { path: `${node.attrs.target}.md` } });
      });
      return { dom };
    };
  },

  addProseMirrorPlugins() {
    let resolveFiles: ((items: { id: string; label: string }[]) => void) | null = null;

    // Listen for files message and resolve pending request
    window.addEventListener('message', (event: MessageEvent) => {
      const msg = event.data;
      if (msg.type === 'files' && msg.payload?.files && resolveFiles) {
        const files = (msg.payload.files as { name: string; relativePath: string }[])
          .filter(f => f.relativePath.endsWith('.md'))
          .map(f => ({ id: f.name, label: f.name }));
        resolveFiles(files);
        resolveFiles = null;
      }
    });

    return [
      Suggestion({
        editor: this.editor,
        char: '[[',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range)
            .insertContent({ type: 'wikiLink', attrs: { target: props.id } })
            .run();
        },
        items: ({ query }: { query: string }) => {
          return new Promise<{ id: string; label: string }[]>(resolve => {
            // Timeout fallback in case no files message arrives
            const timeout = setTimeout(() => { resolveFiles = null; resolve([]); }, 2000);
            resolveFiles = (items) => { clearTimeout(timeout); resolve(items); };
            window.vscode?.postMessage({ type: 'requestFiles', payload: { search: query } });
          });
        },
        render: () => {
          let popup: HTMLDivElement | null = null;

          return {
            onStart(props: any) {
              popup = document.createElement('div');
              popup.className = 'pm-wiki-link-popup';
              document.body.appendChild(popup);
              updatePopup(popup, props);
            },
            onUpdate(props: any) {
              if (popup) updatePopup(popup, props);
            },
            onExit() {
              popup?.remove();
              popup = null;
            },
            onKeyDown({ event }: { event: KeyboardEvent }) {
              if (event.key === 'Escape') {
                popup?.remove();
                popup = null;
                return true;
              }
              return false;
            },
          };
        },
      }),
    ];
  },
});

function updatePopup(container: HTMLDivElement, props: any) {
  const { items, command, clientRect } = props;
  const rect = clientRect?.();
  if (rect) {
    container.style.cssText = `position:fixed;top:${rect.bottom + 4}px;left:${rect.left}px;z-index:1000;`;
  }
  container.innerHTML = '';
  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'pm-wiki-link-empty';
    empty.textContent = 'No .md files found';
    container.appendChild(empty);
  } else {
    items.forEach((item: { id: string; label: string }) => {
      const el = document.createElement('div');
      el.className = 'pm-wiki-link-item';
      el.textContent = item.label;
      el.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        command(item);
      });
      container.appendChild(el);
    });
  }
}
