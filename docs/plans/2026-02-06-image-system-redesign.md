# Image System Redesign

**Date**: 2026-02-06
**Branch**: feature/react-migration
**Status**: Complete

## Overview

Replace the current click-to-edit-raw-markdown image system with a modern image experience:
- Drop zone UI for empty images (from `/image` slash command)
- Drag-to-resize handles (forked from `tiptap-extension-resize-image`)
- Click popover toolbar (alignment, replace, delete)
- File upload to configurable assets directory
- Standard `![alt](src)` markdown serialization (no Obsidian syntax)

## Approach

Fork resize logic from community package inline (Approach C). Convert from vanilla DOM NodeView to React NodeView matching project patterns.

## Key Design Decisions

1. **`textAlign` attribute** instead of inline margin style strings
2. **`width` as number attribute** instead of `containerStyle`/`wrapperStyle` strings
3. **Empty `src` triggers drop zone** — no separate insert dialog
4. **No Obsidian `|widthxheight` syntax** — standard markdown only
5. **Width stored in Tiptap doc model only** — does not leak into markdown output (trade-off: width lost on reload for remote images)

## Implementation Order

1. Extension schema + serialization (ImageNode.ts)
2. CSS overhaul (editor.css)
3. ImageNodeView.tsx rewrite (basic rendering)
4. Drop zone component
5. Resize hook + handles
6. Popover toolbar
7. Alignment CSS classes
8. File upload (VS Code extension side)
9. Slash command update
10. Tests
