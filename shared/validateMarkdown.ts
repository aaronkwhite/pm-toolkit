export interface ValidationResult {
  valid: boolean
  reason?: string
}

/**
 * Validate markdown content before saving to disk.
 * Catches HTML corruption from tiptap-markdown's HTMLNode fallback serializer.
 *
 * Pure function — no DOM or VS Code dependencies.
 */
export function validateMarkdown(content: string): ValidationResult {
  // Zero tolerance: webview-internal URIs must never reach disk
  if (/vscode-(?:resource|webview|cdn)/i.test(content)) {
    return { valid: false, reason: 'Content contains webview-internal URIs' }
  }

  // Zero tolerance: internal data attributes must never reach disk
  if (/data-original-src=/.test(content)) {
    return { valid: false, reason: 'Content contains internal data attributes' }
  }

  // Threshold check: if most of the content is HTML tags, serialization likely failed
  const tagBytes = (content.match(/<[^>]+>/g) || []).reduce((s, t) => s + t.length, 0)
  const totalBytes = content.replace(/\s/g, '').length
  if (totalBytes > 0 && tagBytes / totalBytes > 0.4) {
    return {
      valid: false,
      reason: `HTML ratio too high (${((tagBytes / totalBytes) * 100).toFixed(0)}%)`,
    }
  }

  return { valid: true }
}
