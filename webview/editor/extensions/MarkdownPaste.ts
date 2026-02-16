/**
 * Custom paste handler that parses pasted markdown as a full document
 * instead of inline. Fixes code blocks with blank lines being split
 * into separate elements.
 *
 * tiptap-markdown's default clipboardTextParser uses inline parsing mode
 * which runs normalizeInline() — that function can't handle block elements
 * like <pre> and splits code blocks at blank lines.
 */
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DOMParser as PMDOMParser } from '@tiptap/pm/model'

export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          clipboardTextParser(text, $context, plainText) {
            if (plainText) return null

            // Parse as full document (not inline) to preserve block elements
            const parsed = editor.storage.markdown?.parser?.parse(text)
            if (!parsed) return null

            const element = document.createElement('div')
            element.innerHTML = parsed

            return PMDOMParser.fromSchema(editor.schema).parseSlice(element, {
              preserveWhitespace: true,
              context: $context,
            })
          },
        },
      }),
    ]
  },
})
