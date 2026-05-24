/**
 * WikiLink Extension
 *
 * A Tiptap inline atom node that recognizes [[Page Name]] and
 * [[Page Name|Display Text]] syntax in markdown.
 *
 * Renders as a styled inline chip in the editor. On click, sends a
 * `openWikiLink` message to the VS Code extension host to open the linked file.
 *
 * Round-trips correctly: serializes back to [[Page]] / [[Page|Display]] syntax
 * via tiptap-markdown's addStorage hook.
 */

import { Node, mergeAttributes } from '@tiptap/core'

export const WikiLink = Node.create({
  name: 'wikiLink',

  inline: true,
  group: 'inline',
  atom: true,

  addAttributes() {
    return {
      page: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-page') || '',
        renderHTML: (attributes) => ({ 'data-page': attributes.page }),
      },
      display: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-display') || '',
        renderHTML: (attributes) => ({ 'data-display': attributes.display }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-wiki-link]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const { page, display } = node.attrs
    const label = display && display !== page ? display : page
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-wiki-link': '',
        class: 'pm-wiki-link',
      }),
      `[[${label}]]`,
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const { page, display } = node.attrs
          if (display && display !== page) {
            state.write(`[[${page}|${display}]]`)
          } else {
            state.write(`[[${page}]]`)
          }
        },
        parse: {
          setup(markdownit: any) {
            // Add inline rule for [[Page]] and [[Page|Display]] syntax
            markdownit.inline.ruler.push('wiki_link', (state: any, silent: boolean) => {
              if (
                state.src[state.pos] !== '[' ||
                state.src[state.pos + 1] !== '['
              ) {
                return false
              }

              const start = state.pos + 2
              const end = state.src.indexOf(']]', start)
              if (end === -1) return false

              // Disallow nested brackets
              const inner = state.src.slice(start, end)
              if (inner.indexOf('[') !== -1) return false

              if (!silent) {
                const parts = inner.split('|')
                const page = parts[0].trim()
                const display = parts[1] ? parts[1].trim() : ''

                const token = state.push('wiki_link', '', 0)
                token.attrSet('data-wiki-link', '')
                token.attrSet('data-page', page)
                token.attrSet('data-display', display)
                token.content = inner
              }

              state.pos = end + 2
              return true
            })
          },
        },
      },
    }
  },

  addNodeView() {
    return ({ node }) => {
      const { page, display } = node.attrs
      const label = display && display !== page ? display : page

      const dom = document.createElement('span')
      dom.setAttribute('data-wiki-link', '')
      dom.setAttribute('data-page', page)
      dom.setAttribute('data-display', display)
      dom.className = 'pm-wiki-link'
      dom.textContent = `[[${label}]]`

      dom.addEventListener('click', (e) => {
        e.preventDefault()
        // Post message to extension host to open the linked file
        window.vscode?.postMessage({ type: 'openWikiLink', page })
      })

      return { dom }
    }
  },
})

// ---------------------------------------------------------------------------
// Preprocessing — called before markdown is sent to Tiptap parser
// ---------------------------------------------------------------------------

/**
 * Convert [[Page]] and [[Page|Display]] wiki link syntax to
 * <span data-wiki-link data-page="..." data-display="...">...</span>
 * so Tiptap's HTML parser picks it up via the node's parseHTML rule.
 */
export function preprocessWikiLinksToHtml(markdown: string): string {
  return markdown.replace(
    /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g,
    (_match, page, display) => {
      const safePage = page.trim().replace(/"/g, '&quot;')
      const safeDisplay = (display || '').trim().replace(/"/g, '&quot;')
      const label = safeDisplay && safeDisplay !== safePage ? safeDisplay : safePage
      return `<span data-wiki-link="" data-page="${safePage}" data-display="${safeDisplay}" class="pm-wiki-link">[[${label}]]</span>`
    }
  )
}
