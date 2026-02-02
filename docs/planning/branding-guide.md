# PM Toolkit Branding Guide

## Positioning

### Tagline
> Visual editing tools for the AI-powered workflow

### One-liner
> Notion-like editing in Cursor/VS Code - markdown, kanban, and diagrams in one extension.

### Elevator Pitch
PM Toolkit brings visual editing superpowers to Cursor and VS Code. Edit markdown with a Notion-like WYSIWYG editor, manage tasks on kanban boards that stay as plain text files, render Mermaid diagrams instantly, and preview PDFs, Word docs, and spreadsheets without leaving your editor. Built by a product manager for anyone who wants Cursor's AI capabilities without wrestling with raw markup. Your files stay portable—everything is just markdown.

---

## Target Audience

### Primary: Product Managers using Cursor
- Want AI assistance but find raw markdown frustrating
- Familiar with Notion, Confluence, Linear
- Need to write PRDs, specs, meeting notes

### Secondary: Non-technical professionals
- Designers, writers, marketers exploring Cursor
- Intimidated by "code editor" aesthetics
- Value visual tools over text-based interfaces

### Tertiary: Developers who prefer visual editing
- Want WYSIWYG for documentation
- Appreciate that files stay as plain markdown
- Use kanban for personal task management

---

## Key Messages

### Value Propositions

| Feature | Technical | User Benefit |
|---------|-----------|--------------|
| WYSIWYG Editor | Tiptap-based markdown editing | Edit visually - no syntax needed |
| Slash Commands | Suggestion plugin with templates | Type `/` to insert anything |
| Kanban Boards | Markdown table storage | Manage tasks visually, files stay portable |
| Mermaid Diagrams | Live rendering | See diagrams as you write |
| File Viewers | PDF.js, Mammoth, SheetJS | Open docs without leaving your editor |

### Trust Signals
- "Your files stay as plain markdown - nothing breaks"
- "Uninstall anytime with no side effects"
- "Open source and MIT licensed"
- "Built by a PM, for PMs"

### Differentiators
- **vs. multiple extensions**: One tool replaces 3-4 separate extensions
- **vs. Notion/Confluence**: Lives in your editor, files are portable markdown
- **vs. raw markdown**: Visual editing with familiar slash commands
- **vs. developer tools**: Designed for non-developers first

---

## Voice & Tone

### Do
- Be approachable and friendly
- Use plain language, avoid jargon
- Focus on outcomes, not features
- Acknowledge the learning curve of code editors

### Don't
- Use developer terminology without explanation
- Assume familiarity with VS Code/extensions
- Oversell or use marketing superlatives
- Make it sound complicated

### Example Transformations

| Instead of... | Say... |
|---------------|--------|
| "WYSIWYG markdown rendering" | "Edit visually - what you see is what you get" |
| "Extensible template system" | "Create your own templates" |
| "Markdown-based persistence" | "Your files stay as plain text" |
| "Custom editor provider API" | (don't mention implementation details) |

---

## Visual Identity

### Colors

**Primary**: Editor-neutral (works in light and dark themes)

For marketing materials, use colors that feel:
- Professional but approachable
- Productivity-focused (blues, greens)
- Not overly "techy" or dark

**Suggested palette** (for website/marketing only):

| Use | Color | Hex |
|-----|-------|-----|
| Primary | Calm Blue | `#4A90D9` |
| Secondary | Soft Green | `#5CB85C` |
| Accent | Warm Orange | `#F0AD4E` |
| Dark text | Charcoal | `#333333` |
| Light bg | Off-white | `#FAFAFA` |

### Typography

**Marketing materials:**
- Headlines: System sans-serif (SF Pro, Segoe UI, or Inter)
- Body: Same, optimized for readability

**In-product:**
- Respect VS Code/Cursor theme settings
- Use editor's default fonts

---

## Icon Guidelines

See [Icon Design Brief](#icon-design-brief) below.

---

## Messaging by Channel

### VS Code Marketplace
- Lead with user benefit, not features
- First line must hook non-developers
- Screenshots are critical - show the visual editor

### README.md
- Start with "what problem does this solve"
- Include GIF demo in first scroll
- "Who is this for?" section early

### Social Media
- Frame as "I built this to solve X"
- Lead with the outcome/demo
- Avoid promotional language

### Product Hunt
- Category: Productivity, Developer Tools
- Tagline: "Notion-like editing in your code editor"
- First comment: Share the origin story

---

## Keywords for Discoverability

### Primary (highest intent)
- markdown editor
- wysiwyg markdown
- kanban board
- visual editor

### Secondary (feature-based)
- mermaid diagrams
- pdf viewer
- notion alternative
- slash commands

### Audience-based
- product manager tools
- non-developer
- documentation
- no-code

---

## Icon Design Brief

### Purpose
Main extension icon for VS Code/Cursor marketplace and branding.

### Requirements
- **Format**: PNG (SVG not allowed in marketplace)
- **Size**: 256x256 px master, scales down to 16x16
- **Background**: Solid color or transparent (test on light/dark)

### Concept Direction

The icon should communicate:
1. **Visual/WYSIWYG editing** - not code, not terminal
2. **Productivity tools** - organized, efficient
3. **Approachable** - friendly to non-developers

**Recommended approach**: Abstract representation of a document with visual elements (cards, blocks, or layout hints) rather than literal tools.

### Style Guidelines
- Simple, geometric shapes
- Maximum 3 colors
- No fine details (won't render at small sizes)
- Avoid: code brackets `</>`, terminal prompts `$`, gear icons

### Visual References (mood, not to copy)
- Notion's clean, minimal icon
- Linear's abstract geometric mark
- Obsidian's gem shape (simple but distinctive)

### Existing Assets
The kanban file icons (`icons/kanban-light.svg`, `icons/kanban-dark.svg`) use a simple 3-column card layout. Could extend this visual language.

### Deliverables
1. `icons/icon.png` - 256x256 master
2. Verify readability at 128x128, 64x64, 32x32, 16x16

---

## Asset Checklist

### Required for Launch
- [ ] Extension icon (256x256 PNG)
- [ ] 3-4 screenshots (light and dark themes)
- [ ] Demo GIF (60-90 seconds)
- [ ] Updated README with visuals

### Nice to Have
- [ ] Website hero image
- [ ] Social media preview image (1200x630)
- [ ] Product Hunt gallery images
