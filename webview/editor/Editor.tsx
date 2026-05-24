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
import { useEffect, useRef, useCallback, useState } from 'react'
import { validateMarkdown } from '../../shared/validateMarkdown'

// Components
import { BlockHandle } from './components/BlockHandle'
import { DocumentOutline } from './components/DocumentOutline'
import { BubbleMenuToolbar } from './components/BubbleMenu'
import { FindReplaceBar } from './components/FindReplaceBar'
import { DiffToolbar } from './components/DiffToolbar'
import { CommentsPanel } from './components/CommentsPanel'

// Extensions
import { CustomParagraph } from './extensions/CustomParagraph'
import { KeyboardNavigation } from './extensions/KeyboardNavigation'
import { SlashCommand, setTemplates } from './extensions/SlashCommand'
import { ImageNode } from './extensions/ImageNode'
import { MermaidNode } from './extensions/MermaidNode'
import { TableControls } from './extensions/TableControls'
import { MarkdownPaste } from './extensions/MarkdownPaste'
import { FindReplace } from './extensions/FindReplace'
import { AiDiff } from './extensions/AiDiff'
import { Callout } from './extensions/Callout'
import {
  CommentMark,
  parseCommentsFromMarkdown,
  type ParsedComment,
} from './extensions/CommentMark'
import { WikiLink, preprocessWikiLinksToHtml } from './extensions/WikiLink'
import { FrontmatterPanel } from './components/FrontmatterPanel'

// VS Code API type
declare global {
  interface Window {
    vscode: {
      postMessage: (message: unknown) => void
      getState: () => unknown
      setState: (state: unknown) => void
    }
    _getEditorContent?: () => string
    __mermaidBlocks?: string[]
  }
}

/**
 * Preprocess markdown to protect mermaid code blocks from being mangled
 * during double-parsing (explicit parse + tiptap-markdown's setContent override).
 * Extracts mermaid block content into window.__mermaidBlocks and replaces it with
 * simple placeholders that survive the double parse. The MermaidNode plugin's
 * appendTransaction resolves placeholders back to the original content.
 */
function preprocessMermaidBlocks(markdown: string): string {
  const mermaidBlocks: string[] = []
  window.__mermaidBlocks = mermaidBlocks

  const processed = markdown.replace(
    /```mermaid\n([\s\S]*?)```/g,
    (_match, content) => {
      const index = mermaidBlocks.length
      mermaidBlocks.push(content.trimEnd())
      return '```mermaid\n___MERMAID_BLOCK_' + index + '___\n```'
    }
  )

  return processed
}

/**
 * Strip YAML frontmatter (---...---) from the top of a markdown string,
 * returning only the body content.
 */
function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith('---')) return markdown
  const end = markdown.indexOf('\n---', 3)
  if (end === -1) return markdown
  return markdown.slice(end + 4).replace(/^\n/, '')
}

/**
 * Extract the raw frontmatter block (including delimiters) from a markdown string,
 * or return an empty string if none is present.
 */
function extractFrontmatterBlock(markdown: string): string {
  if (!markdown.startsWith('---')) return ''
  const end = markdown.indexOf('\n---', 3)
  if (end === -1) return ''
  return markdown.slice(0, end + 4)
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
  const [comments, setComments] = useState<ParsedComment[]>(() =>
    parseCommentsFromMarkdown(initialContent ?? '')
  )
  const [wordCount, setWordCount] = useState(0)
  const [frontmatterBlock, setFrontmatterBlock] = useState(() => extractFrontmatterBlock(initialContent))
  const frontmatterBlockRef = useRef(extractFrontmatterBlock(initialContent))

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
        transformPastedText: false,
        transformCopiedText: true,
      }),
      MarkdownPaste,
      SlashCommand,
      KeyboardNavigation,
      FindReplace,
      AiDiff,
      Callout,
      CommentMark,
      WikiLink,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      if (isUpdatingFromExtension.current) return

      // Update word count immediately (cheap operation)
      const text = editor.state.doc.textContent
      setWordCount(text.trim().split(/\s+/).filter(Boolean).length)

      // Debounce updates
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current)
      }

      updateTimeout.current = window.setTimeout(() => {
        const markdown = editor.storage.markdown.getMarkdown()

        const validation = validateMarkdown(markdown)
        if (!validation.valid) {
          console.warn('[PM Toolkit] Save blocked:', validation.reason)
          return
        }

        // Update comments panel from the serialized markdown
        setComments(parseCommentsFromMarkdown(markdown))

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

            // Update comments panel from the incoming markdown
            setComments(parseCommentsFromMarkdown(content))

            // Sync frontmatter panel state when content arrives from extension
            const newFmBlock = extractFrontmatterBlock(content)
            setFrontmatterBlock(newFmBlock)
            frontmatterBlockRef.current = newFmBlock

            // Strip frontmatter before passing body to Tiptap
            const body = stripFrontmatter(content)

            // Preprocess wiki link syntax → HTML so Tiptap's HTML parser picks it up
            const wikiLinkProcessed = preprocessWikiLinksToHtml(body)

            // Preprocess mermaid blocks to protect them from double-parsing.
            // Comment syntax (==text==^[comment]) is handled by the markdown-it
            // core rule registered in CommentMark.addStorage().markdown.parse.setup,
            // so no HTML preprocessing is needed here.
            const processedContent = preprocessMermaidBlocks(wikiLinkProcessed)

            // Set content without adding to undo history.
            // Pass markdown directly to setContent — tiptap-markdown's override
            // handles parsing. Don't pass preserveWhitespace: 'full' globally;
            // code_block's own parseDOM rule already sets it for <pre> elements.
            // (Using preserveWhitespace: 'full' here would cause tiptap core to
            // redirect through insertContentAt, which tiptap-markdown also overrides,
            // leading to a triple-parse that corrupts code blocks with blank lines.)
            editor
              .chain()
              .command(({ tr }) => {
                tr.setMeta('addToHistory', false)
                return true
              })
              .setContent(processedContent, false)
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

        // Templates received from extension
        case 'templates': {
          if (message.payload?.templates) {
            setTemplates(message.payload.templates)
          }
          break
        }

        case 'openFind': {
          window.dispatchEvent(new CustomEvent('open-find'))
          break
        }

        case 'openFindReplace': {
          window.dispatchEvent(new CustomEvent('open-find-replace'))
          break
        }

        case 'showDiff': {
          editor.commands.showDiff(message.regions, message.mode)
          break
        }

        case 'clearDiff': {
          editor.commands.clearDiff()
          break
        }

        // HTML export request from extension
        case 'requestHtmlExport': {
          const html = editor.getHTML()
          window.vscode?.postMessage({ type: 'exportHtml', html })
          break
        }

        // PDF export request from extension
        case 'requestPdfExport': {
          let html = editor.getHTML()

          // Replace mermaid code blocks with rendered SVGs from the DOM
          const mermaidDiagrams = document.querySelectorAll('.mermaid-diagram svg')
          const mermaidPres = html.match(/<pre[^>]*data-type="mermaid"[^>]*>[\s\S]*?<\/pre>/g) || []

          mermaidDiagrams.forEach((svg, index) => {
            if (mermaidPres[index]) {
              const svgHtml = svg.outerHTML
              html = html.replace(mermaidPres[index], `<div class="mermaid-diagram">${svgHtml}</div>`)
            }
          })

          getVSCode().postMessage({ type: 'exportPdf', payload: { htmlContent: html } })
          break
        }
      }
    }

    window.addEventListener('message', handleMessage)

    // Expose methods for testing
    window._getEditorContent = () => editor.storage.markdown.getMarkdown()
    ;(window as any).__validateMarkdown = validateMarkdown

    // Signal ready only after the message handler is set up
    getVSCode().postMessage({ type: 'ready' })

    // Request templates from extension
    getVSCode().postMessage({ type: 'requestTemplates' })

    return () => {
      window.removeEventListener('message', handleMessage)
      delete window._getEditorContent
    }
  }, [editor])

  // Comment popover state — shows comment text when user clicks a highlighted span
  const [commentPopover, setCommentPopover] = useState<{
    text: string
    x: number
    y: number
    element: HTMLElement
    editMode: boolean
    editValue: string
  } | null>(null)

  // Click handler for comment marks — reads data-comment from DOM
  useEffect(() => {
    if (!editor) return
    const editorDom = editor.view.dom

    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('mark[data-comment]') as HTMLElement | null
      if (target) {
        const commentText = target.getAttribute('data-comment') ?? ''
        const rect = target.getBoundingClientRect()
        setCommentPopover({
          text: commentText,
          x: rect.left + rect.width / 2,
          y: rect.bottom + window.scrollY + 6,
          element: target,
          editMode: false,
          editValue: commentText,
        })
        e.stopPropagation()
      } else {
        setCommentPopover(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCommentPopover(null)
    }

    const handleScroll = () => {
      setCommentPopover(null)
    }

    editorDom.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleScroll, { capture: true, passive: true })
    return () => {
      editorDom.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleScroll, { capture: true })
    }
  }, [editor])

  // Position cursor inside the comment mark using the stored DOM element,
  // then use extendMarkRange to select the full mark span for chain operations.
  const focusAtCommentMark = useCallback(
    (element: HTMLElement) => {
      try {
        const pos = editor.view.posAtDOM(element, 0)
        editor.chain().focus().setTextSelection(pos).extendMarkRange('comment').run()
      } catch {
        editor.commands.focus()
      }
    },
    [editor]
  )

  const handlePopoverDelete = useCallback(() => {
    if (!commentPopover) return
    focusAtCommentMark(commentPopover.element)
    editor.chain().extendMarkRange('comment').unsetMark('comment').run()
    setCommentPopover(null)
  }, [commentPopover, editor, focusAtCommentMark])

  const handlePopoverEditSave = useCallback(() => {
    if (!commentPopover) return
    const newText = commentPopover.editValue.trim()
    if (!newText) return
    focusAtCommentMark(commentPopover.element)
    editor
      .chain()
      .extendMarkRange('comment')
      .setMark('comment', { commentText: newText })
      .run()
    setCommentPopover(null)
  }, [commentPopover, editor, focusAtCommentMark])

  console.log('[PM Toolkit] editor instance:', editor ? 'created' : 'null')

  if (!editor) {
    return <div className="editor-loading" style={{ color: 'white', padding: '20px' }}>Loading editor...</div>
  }

  console.log('[PM Toolkit] Rendering full editor UI')

  const handleAcceptAllDiff = useCallback(() => {
    editor.commands.clearDiff()
    window.vscode?.postMessage({ type: 'acceptAllDiff' })
  }, [editor])

  const handleRejectAllDiff = useCallback(() => {
    editor.commands.clearDiff()
    window.vscode?.postMessage({ type: 'rejectAllDiff' })
  }, [editor])

  const handleDeleteComment = useCallback(
    (id: string, highlightText: string) => {
      const index = parseInt(id.replace('comment-', ''), 10)
      if (isNaN(index)) return
      const current = lastKnownContent.current
      const pattern = new RegExp(
        `==${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}==\\^\\[[^\\]]*\\]`,
        'g'
      )
      let occurrence = 0
      const updated = current.replace(pattern, (match) => {
        if (occurrence === index) {
          occurrence++
          return highlightText // remove comment, keep text
        }
        occurrence++
        return match // leave other occurrences unchanged
      })
      if (updated === current) return
      lastKnownContent.current = updated
      setComments(parseCommentsFromMarkdown(updated))
      isUpdatingFromExtension.current = true
      // Strip frontmatter before passing body to Tiptap
      const bodyForDelete = stripFrontmatter(updated)
      // Preprocess wiki link syntax → HTML so Tiptap's HTML parser picks it up
      const wikiLinkProcessedDelete = preprocessWikiLinksToHtml(bodyForDelete)
      // Pass raw markdown — the CommentMark markdown-it rule handles comment syntax
      const processedContent = preprocessMermaidBlocks(wikiLinkProcessedDelete)
      editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta('addToHistory', false)
          return true
        })
        .setContent(processedContent, false)
        .run()
      isUpdatingFromExtension.current = false
      getVSCode().postMessage({ type: 'update', payload: { content: updated } })
      getVSCode().setState({ content: updated })
    },
    [editor]
  )

  const handleEditComment = useCallback(
    (_id: string, highlightText: string, newCommentText: string) => {
      const index = parseInt(_id.replace('comment-', ''), 10)
      if (isNaN(index)) return
      const current = lastKnownContent.current
      const pattern = new RegExp(
        `==${highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}==\\^\\[[^\\]]*\\]`,
        'g'
      )
      let occurrence = 0
      const updated = current.replace(pattern, (match) => {
        if (occurrence === index) {
          occurrence++
          return `==${highlightText}==^[${newCommentText}]`
        }
        occurrence++
        return match // leave other occurrences unchanged
      })
      if (updated === current) return
      lastKnownContent.current = updated
      setComments(parseCommentsFromMarkdown(updated))
      isUpdatingFromExtension.current = true
      const bodyForEdit = stripFrontmatter(updated)
      const wikiLinkProcessed = preprocessWikiLinksToHtml(bodyForEdit)
      const processedContent = preprocessMermaidBlocks(wikiLinkProcessed)
      editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta('addToHistory', false)
          return true
        })
        .setContent(processedContent, false)
        .run()
      isUpdatingFromExtension.current = false
      getVSCode().postMessage({ type: 'update', payload: { content: updated } })
      getVSCode().setState({ content: updated })
    },
    [editor]
  )

  // Handler: frontmatter panel changes — update state, sync editor save, and post to extension
  const handleFrontmatterChange = useCallback(
    (newMarkdown: string) => {
      const newFmBlock = extractFrontmatterBlock(newMarkdown)
      setFrontmatterBlock(newFmBlock)
      frontmatterBlockRef.current = newFmBlock
      lastKnownContent.current = newMarkdown
      getVSCode().postMessage({ type: 'update', payload: { content: newMarkdown } })
      getVSCode().setState({ content: newMarkdown })
    },
    []
  )

  return (
    <div id="editor-wrapper" style={{ position: 'relative' }} onClick={() => setCommentPopover(null)}>
      <DiffToolbar editor={editor} onAccept={handleAcceptAllDiff} onReject={handleRejectAllDiff} />
      <FindReplaceBar editor={editor} />
      <FrontmatterPanel content={lastKnownContent.current} onChange={handleFrontmatterChange} />
      <BlockHandle editor={editor} />
      <EditorContent editor={editor} />
      <BubbleMenuToolbar editor={editor} />
      <DocumentOutline editor={editor} />
      <CommentsPanel
        comments={comments}
        onDelete={handleDeleteComment}
        onEdit={handleEditComment}
      />
      {commentPopover && (
        <div
          className="pm-comment-popover"
          style={{
            position: 'fixed',
            left: commentPopover.x,
            top: commentPopover.y,
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'var(--vscode-editorWidget-background, #252526)',
            color: 'var(--vscode-editorWidget-foreground, #cccccc)',
            border: '1px solid var(--vscode-editorWidget-border, #454545)',
            borderRadius: '4px',
            padding: '8px 10px',
            maxWidth: '320px',
            minWidth: '160px',
            fontSize: '13px',
            lineHeight: '1.4',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            pointerEvents: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {commentPopover.editMode ? (
            <>
              <textarea
                className="pm-comment-popover-textarea"
                autoFocus
                value={commentPopover.editValue}
                onChange={(e) =>
                  setCommentPopover((prev) => prev ? { ...prev, editValue: e.target.value } : prev)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handlePopoverEditSave()
                  } else if (e.key === 'Escape') {
                    setCommentPopover((prev) => prev ? { ...prev, editMode: false, editValue: prev.text } : prev)
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '60px',
                  background: 'var(--vscode-input-background, #3c3c3c)',
                  color: 'var(--vscode-input-foreground, #cccccc)',
                  border: '1px solid var(--vscode-input-border, #555)',
                  borderRadius: '3px',
                  padding: '4px 6px',
                  fontSize: '13px',
                  lineHeight: '1.4',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end' }}>
                <button
                  className="pm-comment-popover-btn"
                  onClick={() =>
                    setCommentPopover((prev) => prev ? { ...prev, editMode: false, editValue: prev.text } : prev)
                  }
                  style={{
                    background: 'transparent',
                    color: 'var(--vscode-editorWidget-foreground, #cccccc)',
                    border: '1px solid var(--vscode-editorWidget-border, #454545)',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  className="pm-comment-popover-btn pm-comment-popover-save"
                  onClick={handlePopoverEditSave}
                  style={{
                    background: 'var(--vscode-button-background, #0e639c)',
                    color: 'var(--vscode-button-foreground, #ffffff)',
                    border: 'none',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginBottom: '6px',
                }}
              >
                {commentPopover.text}
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  className="pm-comment-popover-btn pm-comment-popover-edit"
                  title="Edit comment"
                  onClick={() =>
                    setCommentPopover((prev) => prev ? { ...prev, editMode: true } : prev)
                  }
                  style={{
                    background: 'transparent',
                    color: 'var(--vscode-editorWidget-foreground, #cccccc)',
                    border: '1px solid var(--vscode-editorWidget-border, #454545)',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Z" fill="currentColor"/>
                  </svg>
                  Edit
                </button>
                <button
                  className="pm-comment-popover-btn pm-comment-popover-delete"
                  title="Delete comment"
                  onClick={handlePopoverDelete}
                  style={{
                    background: 'transparent',
                    color: 'var(--vscode-errorForeground, #f48771)',
                    border: '1px solid var(--vscode-editorWidget-border, #454545)',
                    borderRadius: '3px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <path fillRule="evenodd" clipRule="evenodd" d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75Zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75ZM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15H5.405a1.748 1.748 0 0 1-1.741-1.576l-.66-6.6a.75.75 0 1 1 1.492-.149Z" fill="currentColor"/>
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {wordCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: 8,
            right: 12,
            fontSize: 11,
            color: 'var(--vscode-descriptionForeground)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 10,
          }}
        >
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>
      )}
    </div>
  )
}
