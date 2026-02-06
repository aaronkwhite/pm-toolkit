// webview/editor/index.tsx
import { createRoot } from 'react-dom/client'
import { Editor } from './Editor'

// Get VS Code API
const vscode = (window as any).acquireVsCodeApi?.() || (window as any).vscode

// Make vscode available globally
;(window as any).vscode = vscode

// Mount React app
const container = document.getElementById('editor')
if (container) {
  // Clear any existing content
  container.innerHTML = ''

  const root = createRoot(container)
  root.render(<Editor />)
}
