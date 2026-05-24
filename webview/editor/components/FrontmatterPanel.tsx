// webview/editor/components/FrontmatterPanel.tsx
import { useState, useCallback } from 'react'
import matter from 'gray-matter'

interface FrontmatterField {
  key: string
  value: string
}

interface FrontmatterPanelProps {
  /** Raw markdown string (may contain frontmatter) */
  content: string
  /** Called with the full updated markdown whenever frontmatter changes */
  onChange: (newMarkdown: string) => void
}

function parseFrontmatter(content: string): { fields: FrontmatterField[]; body: string } {
  try {
    const parsed = matter(content)
    const fields: FrontmatterField[] = Object.entries(parsed.data ?? {}).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '' : String(value),
    }))
    return { fields, body: parsed.content }
  } catch {
    return { fields: [], body: content }
  }
}

function serializeToMarkdown(fields: FrontmatterField[], body: string): string {
  const validFields = fields.filter((f) => f.key.trim() !== '')
  if (validFields.length === 0) {
    // No frontmatter — just return the body (trimmed of leading newline)
    return body.replace(/^\n/, '')
  }
  const data: Record<string, string> = {}
  for (const f of validFields) {
    data[f.key.trim()] = f.value
  }
  // Build YAML frontmatter manually to avoid gray-matter stringification quirks
  const yamlLines = Object.entries(data).map(([k, v]) => {
    // Quote values that contain colons or special chars
    const needsQuote = /[:#\[\]{},|>&*!'"?]/.test(v) || v.trim() !== v
    return needsQuote ? `${k}: "${v.replace(/"/g, '\\"')}"` : `${k}: ${v}`
  })
  const frontmatter = `---\n${yamlLines.join('\n')}\n---`
  const bodyContent = body.replace(/^\n/, '')
  return bodyContent ? `${frontmatter}\n\n${bodyContent}` : frontmatter
}

export function FrontmatterPanel({ content, onChange }: FrontmatterPanelProps) {
  const { fields: initialFields, body } = parseFrontmatter(content)
  const hasInitialFrontmatter = initialFields.length > 0

  const [fields, setFields] = useState<FrontmatterField[]>(initialFields)
  const [isExpanded, setIsExpanded] = useState(hasInitialFrontmatter)
  const [body_] = useState(body)

  const emitChange = useCallback(
    (nextFields: FrontmatterField[]) => {
      onChange(serializeToMarkdown(nextFields, body_))
    },
    [onChange, body_]
  )

  const handleKeyChange = useCallback(
    (index: number, newKey: string) => {
      const next = fields.map((f, i) => (i === index ? { ...f, key: newKey } : f))
      setFields(next)
      emitChange(next)
    },
    [fields, emitChange]
  )

  const handleValueChange = useCallback(
    (index: number, newValue: string) => {
      const next = fields.map((f, i) => (i === index ? { ...f, value: newValue } : f))
      setFields(next)
      emitChange(next)
    },
    [fields, emitChange]
  )

  const handleDelete = useCallback(
    (index: number) => {
      const next = fields.filter((_, i) => i !== index)
      setFields(next)
      emitChange(next)
    },
    [fields, emitChange]
  )

  const handleAddField = useCallback(() => {
    const next = [...fields, { key: '', value: '' }]
    setFields(next)
    // Don't emit on add — empty key is skipped in serialization
  }, [fields])

  return (
    <div
      style={{
        background: 'var(--vscode-editorWidget-background)',
        borderBottom: '1px solid var(--vscode-panel-border)',
        userSelect: 'none',
        maxWidth: '900px',
        margin: '0 auto',
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px 20px',
          height: '36px',
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '11px',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        {/* Chevron */}
        <span
          style={{
            display: 'inline-block',
            transition: 'transform 0.15s ease',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: '10px',
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          &#9658;
        </span>
        <span style={{ fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Properties
        </span>
        {fields.length > 0 && !isExpanded && (
          <span
            style={{
              marginLeft: '4px',
              opacity: 0.6,
              fontSize: '10px',
            }}
          >
            ({fields.length} field{fields.length !== 1 ? 's' : ''})
          </span>
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: '0 20px 10px 20px', userSelect: 'text' }}>
          {fields.length === 0 && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                padding: '4px 0 8px',
                opacity: 0.6,
                fontStyle: 'italic',
              }}
            >
              No properties yet. Click "Add field" to get started.
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '6px',
              }}
            >
              {/* Key input */}
              <input
                type="text"
                value={field.key}
                placeholder="key"
                onChange={(e) => handleKeyChange(index, e.target.value)}
                style={{
                  width: '130px',
                  flexShrink: 0,
                  fontSize: '12px',
                  fontFamily: 'var(--vscode-editor-font-family, monospace)',
                  color: 'var(--vscode-descriptionForeground)',
                  background: 'var(--vscode-input-background)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '3px',
                  padding: '3px 6px',
                  outline: 'none',
                }}
              />

              {/* Separator */}
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--vscode-descriptionForeground)',
                  opacity: 0.5,
                  flexShrink: 0,
                }}
              >
                :
              </span>

              {/* Value input */}
              <input
                type="text"
                value={field.value}
                placeholder="value"
                onChange={(e) => handleValueChange(index, e.target.value)}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  color: 'var(--vscode-input-foreground)',
                  background: 'var(--vscode-input-background)',
                  border: '1px solid var(--vscode-input-border)',
                  borderRadius: '3px',
                  padding: '3px 6px',
                  outline: 'none',
                }}
              />

              {/* Delete button */}
              <button
                onClick={() => handleDelete(index)}
                title="Remove field"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--vscode-descriptionForeground)',
                  fontSize: '14px',
                  lineHeight: 1,
                  padding: '2px 4px',
                  flexShrink: 0,
                  opacity: 0.6,
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color =
                    'var(--vscode-errorForeground)'
                  ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.color =
                    'var(--vscode-descriptionForeground)'
                  ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.6'
                }}
              >
                &times;
              </button>
            </div>
          ))}

          {/* Add field button */}
          <button
            onClick={handleAddField}
            style={{
              marginTop: '4px',
              background: 'none',
              border: '1px dashed var(--vscode-input-border)',
              borderRadius: '3px',
              cursor: 'pointer',
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '11px',
              padding: '3px 10px',
              opacity: 0.7,
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                'var(--vscode-textLink-foreground)'
              ;(e.currentTarget as HTMLButtonElement).style.color =
                'var(--vscode-textLink-foreground)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.7'
              ;(e.currentTarget as HTMLButtonElement).style.borderColor =
                'var(--vscode-input-border)'
              ;(e.currentTarget as HTMLButtonElement).style.color =
                'var(--vscode-descriptionForeground)'
            }}
          >
            + Add field
          </button>
        </div>
      )}
    </div>
  )
}
