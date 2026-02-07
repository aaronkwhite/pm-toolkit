// webview/editor/Editor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { CustomTable } from './extensions/CustomTable'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useRef, useCallback } from 'react'

// Components
import { BlockHandle } from './components/BlockHandle'
import { DocumentOutline } from './components/DocumentOutline'

// Keep existing extensions for now (will convert later)
import { CustomParagraph } from './extensions/CustomParagraph'
import { KeyboardNavigation } from './extensions/KeyboardNavigation'
import { SlashCommand } from './extensions/SlashCommand'
import { ImageNode } from './extensions/ImageNode'
import { MermaidNode } from './extensions/MermaidNode'
import { TableControls } from './extensions/TableControls'
import { BubbleMenuExtension } from './extensions/BubbleMenu'

// VS Code API type
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void
      getState: () => unknown
      setState: (state: unknown) => void
    }
    _getEditorContent?: () => string
  }
}

// Get vscode API - it should be set by index.tsx before this component mounts
const getVSCode = () => window.vscode

interface EditorProps {
  initialContent?: string
  filename?: string
}

export function Editor({ initialContent = '', filename = 'untitled.md' }: EditorProps) {
  console.log('[PM Toolkit] Editor component rendering')

  const isUpdatingFromExtension = useRef(false)
  const updateTimeout = useRef<number | null>(null)
  const lastKnownContent = useRef(initialContent)

  console.log('[PM Toolkit] About to call useEditor')
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        paragraph: false,
      }),
      CustomParagraph,
      Placeholder.configure({
        placeholder: 'Start typing, or press / for commands...',
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { class: 'editor-link' },
      }),
      TaskList.configure({
        HTMLAttributes: { class: 'task-list' },
      }),
      TaskItem.configure({
        nested: true,
        onReadOnlyChecked: () => true,
      }),
      CustomTable.configure({
        resizable: true,
        HTMLAttributes: { class: 'editor-table' },
      }),
      TableRow,
      TableHeader,
      TableCell,
      TableControls,
      ImageNode,
      MermaidNode,
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        linkify: false,
        breaks: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      SlashCommand,
      KeyboardNavigation,
      BubbleMenuExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (isUpdatingFromExtension.current) return

      // Debounce updates
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }

      updateTimeout.current = window.setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown()
        if (markdown !== lastKnownContent.current) {
          lastKnownContent.current = markdown
          getVSCode().postMessage({ type: 'update', payload: { content: markdown } })
          getVSCode().setState({ content: markdown })
        }
      }, 150)
    },
  })

  // Handle messages from extension and signal ready when editor is available
  useEffect(() => {
    if (!editor) return

    const handleMessage = (event: MessageEvent) => {
      const message = event.data

      switch (message.type) {
        case 'init':
        case 'update': {
          const content = message.payload.content
          if (content !== lastKnownContent.current) {
            isUpdatingFromExtension.current = true
            lastKnownContent.current = content

            // Parse the content using the markdown parser
            const doc = editor.storage.markdown.parser.parse(content)

            // Set content without adding to undo history
            // The chain() command with setMeta must be done in the same transaction
            editor
              .chain()
              .command(({ tr }) => {
                tr.setMeta('addToHistory', false)
                return true
              })
              .setContent(doc, false, { preserveWhitespace: 'full' })
              .run()

            isUpdatingFromExtension.current = false
          }
          break
        }
        // Image URL resolution — dispatch as custom event for ImageNodeView
        case 'imageUrl': {
          const { originalPath, webviewUrl } = message.payload
          window.dispatchEvent(
            new CustomEvent('image-url-resolved', { detail: { originalPath, webviewUrl } })
          )
          break
        }

        // Image file saved to assets — dispatch for ImageNodeView drop zone
        case 'imageSaved': {
          const { originalPath, webviewUrl } = message.payload
          window.dispatchEvent(
            new CustomEvent('image-saved', { detail: { originalPath, webviewUrl } })
          )
          break
        }

        // File picker result — dispatch for ImageNodeView drop zone
        case 'filePickerResult': {
          const { originalPath, webviewUrl } = message.payload
          window.dispatchEvent(
            new CustomEvent('file-picker-result', { detail: { originalPath, webviewUrl } })
          )
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)

    // Expose a method to get content directly (for testing)
    window._getEditorContent = () => editor.storage.markdown.getMarkdown()

    // Signal ready only after the message handler is set up
    getVSCode().postMessage({ type: 'ready' })

    return () => {
      window.removeEventListener('message', handleMessage)
      delete window._getEditorContent
    }
  }, [editor])

  console.log('[PM Toolkit] editor instance:', editor ? 'created' : 'null')

  if (!editor) {
    return <div className="editor-loading" style={{ color: 'white', padding: '20px' }}>Loading editor...</div>
  }

  console.log('[PM Toolkit] Rendering full editor UI')

  return (
    <div id="editor-wrapper">
      <BlockHandle editor={editor} />
      <EditorContent editor={editor} />
      <DocumentOutline editor={editor} />
    </div>
  )
}
