# Settings Panel Design

**Issue:** #5 - Improve extension settings (COMPLETED)\
**Date:** 2026-02-02\
**Released:** v0.4.0

## Overview

Dedicated settings panel for PM Toolkit with organized sections for Editor, Templates, Kanban, and Support.

## Access Points

| Location | Trigger | Details |
| --- | --- | --- |
| Command Palette | `PM Toolkit: PM Toolkit Settings` | Always available |
| Editor overflow menu | `...` → "PM Toolkit Settings" | When PM Toolkit editor is active |
| Editor title bar | View Source icon | Separate from settings (unchanged) |

**Note:** VS Code's `editor/title/run` menu only shows a single icon when one command is registered. With multiple commands, it shows a dropdown with run icon. To keep View Source as a visible icon, settings was moved to the overflow menu via `editor/title` with a different group.

## Panel Layout

```
┌─────────────────────────────────────────────────────┐
│  PM Toolkit                                         │
│  Notion-like editing in Cursor/VS Code — markdown,  │
│  kanban, and diagrams in one extension.             │
│                                                     │
│  Editor                                             │
│  ┌─────────────────────────────────────────────────┐│
│  │ Font Size                              [14] px  ││
│  │ Font size for the markdown editor and kanban    ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Templates                                          │
│  ┌─────────────────────────────────────────────────┐│
│  │ Template Folder                                 ││
│  │ Not set                            [Browse]     ││
│  │─────────────────────────────────────────────────││
│  │ Watch for Changes                      [●───]   ││
│  │ Auto-reload templates when files change         ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Kanban                                             │
│  ┌─────────────────────────────────────────────────┐│
│  │ Default Columns                                 ││
│  │ [Backlog, In Progress, Done            ]        ││
│  │─────────────────────────────────────────────────││
│  │ Show Thumbnails                        [●───]   ││
│  │─────────────────────────────────────────────────││
│  │ Save Delay                            [150] ms  ││
│  │ Delay before saving changes to disk             ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  Support the Project                                │
│  ┌─────────────────────────────────────────────────┐│
│  │ If PM Toolkit saves you time, consider buying   ││
│  │ me a coffee...                                  ││
│  │ [Buy Me A Coffee button]                        ││
│  └─────────────────────────────────────────────────┘│
│                                                     │
│  ─────────────────────────────────────────────────  │
│  PM Toolkit v0.4.1                                  │
└─────────────────────────────────────────────────────┘
```

## Settings

| Setting | Type | Default | Range |
| --- | --- | --- | --- |
| `pmtoolkit.editorFontSize` | number | 14 | 10-24 |
| `pmtoolkit.templateFolder` | string | `""` | — |
| `pmtoolkit.templateWatchEnabled` | boolean | `true` | — |
| `pmtoolkit.kanbanDefaultColumns` | string | `"Backlog, In Progress, Done"` | — |
| `pmtoolkit.kanbanShowThumbnails` | boolean | `true` | — |
| `pmtoolkit.kanbanSaveDelay` | number | 150 | 50-2000 |

## Implementation

### Files

| File | Purpose |
| --- | --- |
| `src/settings/SettingsPanel.ts` | WebviewPanel with inline HTML/CSS/JS |
| `package.json` | Commands, menu contributions, configuration schema |
| `src/extension.ts` | Command registration |

### Webview Communication

```typescript
// Webview → Extension
{ type: 'browseFolder' }
{ type: 'updateSetting', key: 'editorFontSize', value: 16 }
{ type: 'openExternal', url: 'https://buymeacoffee.com/...' }
```

### Styling

- Matches Cursor's settings UI aesthetic
- Card-based sections with rounded corners
- Green toggle switches (matches Cursor style)
- Uses VS Code CSS variables for theme support
- Input validation prevents out-of-range values

## Testing

22 E2E tests in `tests/e2e/settings-panel.spec.ts`:

- Layout and content display
- All input controls and toggles
- Message passing to extension
- Input validation

Test harness: `tests/harness/settings-harness.html`