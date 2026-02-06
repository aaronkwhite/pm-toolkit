# PM Toolkit Website Redesign — v0.5.0

## Overview

Redesign the landing page at getpmtoolkit.com to showcase new features (bubble menu, link commands), modernize the visual design, and improve conversion. Shift from vanilla Tailwind to a polished, motion-enhanced experience inspired by Framer/Vercel/Linear.

## Goals

1. **Showcase-first**: Let the product sell itself with prominent screenshots
2. **Conversion-focused**: Marketplace links in hero (required by Cursor)
3. **Modern feel**: Scroll animations, micro-interactions, dark/light mode
4. **Less jargon**: Accessible copy for PMs, not developers

## Design Decisions

| Decision | Choice |
|----------|--------|
| Theme mode | Auto-detect system preference + manual toggle |
| Layout approach | Hero screenshot + scrolling feature sections + bento grid |
| Animation level | Moderate (fade + slide on scroll, button micro-interactions, smooth theme toggle) |
| Icons | Lucide (consistent with extension) |
| Typography | System stack, bolder weights (700-800) for headlines |

## Page Structure

```
1. Header (sticky, glass effect, theme toggle)
2. Hero (headline + CTAs + big screenshot)
3. Feature: Editor (screenshot left, copy right)
4. Feature: Kanban (screenshot right, copy left)
5. Feature: File Viewers (screenshot left, copy right)
6. Bento Grid: Power Features (6 cards)
7. Final CTA Section
8. Footer (minimal)
```

## Section Details

### Header

- Sticky positioning with glass/blur effect
- Logo left
- Nav links: Features, Install, GitHub
- Theme toggle (sun/moon icon) + "Free Forever" badge right
- Smooth transition between light/dark

### Hero

**Headline:**
> "Write beautifully in Cursor"

**Subhead:**
> "A visual editor for markdown, kanban boards, and diagrams — right where you code."

**CTAs (required):**
- Primary: "Install for Cursor" → OpenVSX
- Secondary: "Install for VS Code" → VS Marketplace

**Trust badges:**
- ✓ Free forever
- ✓ Plain markdown files
- ✓ Works offline

**Hero image:** Large screenshot (`pm-toolkit-markdown-editor.png` or `pm-toolkit-markdown-formatting.png`)

**Animation:** Screenshot fades in + slides up (300ms delay after load)

### Feature Section: Editor

**Headline:** "Edit markdown visually"

**Copy:** "No more switching between raw text and preview. Type `/` for slash commands, select text for instant formatting, drag in images."

**Screenshot:** `pm-toolkit-markdown-formatting.png` (shows bubble menu)

**Layout:** Screenshot left, copy right

**Animation:** Screenshot slides in from left, copy fades in from right

### Feature Section: Kanban

**Headline:** "Manage tasks without leaving your editor"

**Copy:** "Drag cards between columns. Your board stays as plain markdown — portable, version-controlled, yours."

**Screenshot:** `pm-toolkit-kanban-editor.png`

**Layout:** Screenshot right, copy left

**Animation:** Screenshot slides in from right, copy fades in from left

### Feature Section: File Viewers

**Headline:** "View docs without context switching"

**Copy:** "PDF, Word, Excel, CSV — open them right in Cursor. No more jumping to Finder or browser."

**Screenshot:** `pm-toolkit-file-viewer.png`

**Layout:** Screenshot left, copy right

**Animation:** Screenshot slides in from left, copy fades in from right

### Bento Grid

**Section headline:** "And so much more"

**Grid:** 3 columns desktop, 2 tablet, 1 mobile

| Card | Title | One-liner | Visual |
|------|-------|-----------|--------|
| Slash Commands | Type `/` for anything | Headings, lists, tables, links, diagrams — all from your keyboard | `pm-toolkit-markdown-slash-commands.png` |
| Bubble Menu | Select → format | Floating toolbar appears when you highlight text | Icon or small screenshot |
| Mermaid Diagrams | Diagrams from text | Flowcharts, sequences, and more render inline | Lucide icon + code visual |
| Templates | Reusable docs | Create templates with dynamic variables like `{{date}}` | Lucide `file-text` icon |
| View Source | See the markdown | One click to view or edit raw markdown anytime | `pm-toolkit-markdown-view-source.png` |
| Settings Panel | Make it yours | Font size, template folder, kanban defaults | `pm-toolkit-settings.png` |

**Card style:**
- Rounded corners (16px)
- Subtle border
- Hover: lift + shadow + border glow
- Icon or thumbnail at top
- Title + one-liner below

**Animation:** Staggered fade-in (50ms delay between cards)

### Final CTA Section

**Background:** Subtle gradient with primary color

**Headline:** "Ready to write visually?"

**Subhead:** "Install in seconds. Free forever."

**CTAs:** Same two marketplace buttons as hero

**Animation:** Fade in on scroll

### Footer

Single row, minimal:
- Left: PM Toolkit logo
- Center: GitHub link, "Buy me a coffee" link
- Right: "Made for people who live in their editor"

## Technical Implementation

### Framework
- Keep Astro
- Add view transitions for smooth page feel

### Animations
- CSS `@keyframes` for base animations
- Intersection Observer API for scroll-triggered effects
- No heavy JS animation libraries

### Dark Mode
- CSS custom properties for all colors
- `prefers-color-scheme` media query for auto-detect
- Manual toggle saves preference to localStorage
- Smooth transition (200ms) on theme change

### Color Palette

**Light mode (current):**
- Primary: `#4A90D9`
- Secondary: `#5CB85C`
- Accent: `#F0AD4E`
- Background: `#FAFAFA`
- Text: `#333333`

**Dark mode (new):**
- Primary: `#5BA0E9` (slightly lighter for contrast)
- Secondary: `#6CC86C`
- Accent: `#FFBD5E`
- Background: `#0D0D0D`
- Surface: `#1A1A1A`
- Text: `#E5E5E5`

### Typography
- Keep system sans-serif stack
- Headlines: 700-800 weight
- Consider slightly larger sizes for hero (5xl → 6xl)

### Icons
- Lucide icons throughout (inline SVG)
- Consistent stroke width (2px)

## Assets Available

Screenshots in `public/images/`:
- `pm-toolkit-markdown-editor.png`
- `pm-toolkit-markdown-formatting.png`
- `pm-toolkit-markdown-slash-commands.png`
- `pm-toolkit-markdown-image-support.png`
- `pm-toolkit-markdown-view-source.png`
- `pm-toolkit-kanban-editor.png`
- `pm-toolkit-file-viewer.png`
- `pm-toolkit-settings.png`

## Files to Modify

| File | Changes |
|------|---------|
| `src/layouts/Layout.astro` | Add dark mode script, update meta |
| `src/styles/global.css` | Dark mode variables, animation keyframes |
| `src/components/Header.astro` | Add theme toggle, glass effect |
| `src/components/Hero.astro` | New copy, screenshot, animations |
| `src/components/Features.astro` | Replace with 3 alternating sections |
| `src/components/BentoGrid.astro` | **New file** — power features grid |
| `src/components/FinalCTA.astro` | **New file** — bottom CTA section |
| `src/components/Footer.astro` | Simplify to single row |
| `src/pages/index.astro` | Update component order |

## References

- [SaaS Landing Page Trends 2026](https://www.saasframe.io/blog/10-saas-landing-page-trends-for-2026-with-real-examples)
- [Framer Dark Mode Academy](https://www.framer.com/academy/lessons/light-dark-mode)
- [Dark Theme Toggle with Tailwind](https://dev.to/mrpbennett/creating-a-dark-theme-switch-with-tailwind-framer-motion-4f4h)
