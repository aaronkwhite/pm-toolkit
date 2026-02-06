// webview/editor/index.tsx
import { createRoot } from 'react-dom/client'
import { Editor } from './Editor'

console.log('[PM Toolkit] index.tsx loaded')

// Get VS Code API
const vscode = (window as any).acquireVsCodeApi?.() || (window as any).vscode
console.log('[PM Toolkit] vscode API:', vscode ? 'found' : 'NOT FOUND')

// Make vscode available globally
;(window as any).vscode = vscode

// Mount React app
const container = document.getElementById('editor')
console.log('[PM Toolkit] container:', container ? 'found' : 'NOT FOUND')

if (container) {
  // Clear any existing content
  container.innerHTML = ''

  try {
    const root = createRoot(container)
    console.log('[PM Toolkit] React root created')
    root.render(<Editor />)
    console.log('[PM Toolkit] Editor rendered')
  } catch (err) {
    console.error('[PM Toolkit] Error rendering:', err)
  }
} else {
  console.error('[PM Toolkit] No #editor container found!')
}
