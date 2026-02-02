# Settings Panel Design

**Issue:** #5 - Improve extension settings
**Date:** 2026-02-02

## Overview

Create a dedicated settings panel for PM Toolkit with a simple, single-page UI. No sidebar needed given the current scope of settings.

## Access Points

| Location | Trigger | Details |
|----------|---------|---------|
| Command Palette | `PM Toolkit: Open Settings` | Always available |
| Editor title bar | Gear icon (`$(gear)`) | When PM Toolkit editor is active |

The gear icon appears in the `navigation` group, to the right of the existing "View Source" icon.

## Panel Layout

```
┌─────────────────────────────────────────────────────┐
│  PM Toolkit                                         │
│  Version 0.3.0                                      │
│  WYSIWYG markdown, kanban boards, and file viewers  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TEMPLATES                                          │
│  ─────────────────────────────────────────────────  │
│  Template Folder                                    │
│  [/path/to/templates                    ] [Browse]  │
│                                                     │
│  ☑ Watch for changes                               │
│    Auto-reload templates when folder changes        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SUPPORT THE PROJECT                                │
│  ─────────────────────────────────────────────────  │
│  If PM Toolkit saves you time, consider buying me   │
│  a coffee. Your support helps keep this project     │
│  maintained and free for everyone.                  │
│                                                     │
│  [Buy Me a Coffee button/image]                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Current Settings

| Setting | Type | Default |
|---------|------|---------|
| `pmtoolkit.templateFolder` | string | `""` |
| `pmtoolkit.templateWatchEnabled` | boolean | `true` |

## Implementation

### Files to Create/Modify

1. **`src/settings/SettingsPanel.ts`** (new)
   - WebviewPanel management
   - HTML generation
   - Message handling for settings updates

2. **`package.json`**
   - Add `pmtoolkit.openSettings` command
   - Add editor/title menu entry with gear icon

3. **`src/extension.ts`**
   - Register settings command
   - Import SettingsPanel

### Webview Communication

```typescript
// Extension → Webview: Send current settings
panel.webview.postMessage({
  type: 'init',
  settings: {
    templateFolder: config.get('templateFolder'),
    templateWatchEnabled: config.get('templateWatchEnabled')
  },
  version: extension.packageJSON.version
});

// Webview → Extension: Update setting
// { type: 'updateSetting', key: 'templateFolder', value: '/path' }
// { type: 'browseFolder' }
```

### Styling

- Match VS Code theme (light/dark)
- Use VS Code CSS variables for colors
- Lucide icons for visual elements inside webview
- Simple, clean layout without unnecessary decoration

## Future Extensibility

The single-page layout can accommodate additional sections:
- Kanban defaults (default columns, thumbnail size)
- Mermaid settings (default view mode)
- Granola sync (when implemented)

If settings grow significantly, a sidebar navigation can be added later.
