# PM Toolkit Website — `docs` branch

## CRITICAL: This is an orphaned branch

This branch (`docs`) is an **orphan branch** that contains only the marketing website. It shares NO history with `main`.

**NEVER merge this branch into `main` or `main` into this branch.** They are completely separate codebases:
- `main` = VS Code extension (TypeScript, React, ProseMirror/Tiptap)
- `docs` = Marketing website (Astro, Tailwind CSS)

## Stack

- **Astro 5** (static output) with Tailwind CSS 4
- Deployed to **Netlify** from the `docs` branch
- Site: https://getpmtoolkit.com

## Project structure

```
src/
  components/   # Astro components (Hero, BentoGrid, Features, etc.)
  content/      # Markdown content (docs.md)
  layouts/      # Layout.astro (base HTML shell, meta tags, OG)
  pages/        # Routes: index.astro, docs.astro, changelog.astro
  styles/       # global.css (CSS variables, animations, component styles)
public/
  images/       # Screenshots, icons, OG image
  llms.txt      # LLM-friendly site summary
  llms-full.txt # Full LLM context
```

## CHANGELOG.md sync

The changelog page reads `CHANGELOG.md` from the repo root at build time. This file lives on `main` and is synced automatically via the `prebuild` npm script:

```
git fetch origin main --depth=1 && git show origin/main:CHANGELOG.md > CHANGELOG.md
```

This runs before every `npm run build` (including Netlify deploys). No manual sync needed — it pulls the latest from `main` each build. The local copy in the working tree is just a cache; the source of truth is always `main`.

## Commands

- `npm run dev` — Local dev server (hot reload)
- `npm run build` — Production build (runs prebuild + astro check + astro build)
- `npm run preview` — Preview production build locally

## CSS architecture

- Tailwind 4 utility classes for layout and spacing
- `global.css` for CSS custom properties (theme colors, spacing), animations, and component-specific styles
- Theme variables: `--text-primary`, `--text-secondary`, `--border-color`, `--bg-card`, etc.
- Dark mode via `prefers-color-scheme` media queries in CSS variables
- Hero animated border uses `@property --gradient-angle` with `conic-gradient` on `::before`/`::after` pseudo-elements

## Safari workarounds

Safari has a WebKit bug where `border-radius` + `overflow: hidden` breaks on elements with animated pseudo-elements or transforms. Use `clip-path: inset(0 round <radius>)` instead of `overflow: hidden` + `border-radius` when clipping content inside animated containers. See `.hero-screenshot` in `global.css`.
