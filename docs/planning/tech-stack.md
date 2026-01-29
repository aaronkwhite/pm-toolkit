# PM Toolkit - Technology Stack

## Summary

| Category | Choice | Alternative Considered | Why This Choice |
|----------|--------|----------------------|-----------------|
| Editor | Tiptap | Vditor, Lexical, BlockNote | Best DX, ProseMirror foundation, most mature |
| Drag-Drop | dnd-kit | Pragmatic DnD, react-beautiful-dnd | Modern, maintained, accessible |
| PDF | PDF.js | - | Industry standard |
| Word | Mammoth.js | docx-preview | Better HTML output |
| Excel | SheetJS | ExcelJS | More complete parsing |
| CSV | Papa Parse | Custom | Battle-tested edge cases |
| Diagrams | Mermaid.js | - | Industry standard |
| Build | esbuild | webpack, rollup | Fast, simple config |
| Language | TypeScript | JavaScript | Type safety |

---

## Detailed Comparison

### Rich Text Editors

#### Tiptap (Chosen)

```
Pros:
+ Built on battle-tested ProseMirror
+ Excellent TypeScript support
+ Modular extension system
+ Great documentation (English)
+ Large community
+ Used by: Asana, GitLab, Substack

Cons:
- Requires understanding ProseMirror concepts
- Pro features are paid (but not needed)
```

#### Vditor

```
Pros:
+ All-in-one solution
+ Works out of the box

Cons:
- Chinese-first documentation
- Smaller community
- Less extensible
- Bundled with many features we don't need
```

#### Lexical (Meta)

```
Pros:
+ Backed by Meta
+ Performance optimized
+ Growing community

Cons:
- Still pre-1.0
- Lacks pure decorations
- Less mature ecosystem
```

#### BlockNote

```
Pros:
+ Notion-style out of the box
+ Fastest to ship
+ Built on Tiptap

Cons:
- React-only
- Another abstraction layer
- Less customizable
```

**Decision: Tiptap** - Best balance of maturity, flexibility, and developer experience.

---

### Drag and Drop Libraries

#### dnd-kit (Chosen)

```
Pros:
+ Most modern library
+ 5.3M weekly downloads
+ Excellent customization
+ Built-in accessibility
+ Keyboard support
+ Smooth animations

Cons:
- React-focused (but works in webviews)
```

#### Pragmatic Drag and Drop (Atlassian)

```
Pros:
+ Smallest bundle size
+ Framework agnostic
+ Official Atlassian replacement

Cons:
- Based on HTML5 DnD API (less smooth)
- Newer, less ecosystem
```

#### react-beautiful-dnd

```
Status: DEPRECATED (2022)
- Use @hello-pangea/dnd fork if needed
- No new features
```

**Decision: dnd-kit** - Modern, accessible, smooth animations, actively maintained.

---

### File Parsing Libraries

#### PDF.js

```
Pros:
+ Mozilla-maintained
+ Industry standard
+ Works everywhere
+ No real alternative

Usage: Load via CDN in webview
```

#### Mammoth.js

```
Pros:
+ Clean HTML output
+ Handles styles well
+ Maintained

Alternatives:
- docx-preview: More features but heavier
- docx: Lower level, more work
```

#### SheetJS

```
Pros:
+ Industry standard
+ Handles all Excel formats
+ Sheet tabs support

Alternatives:
- ExcelJS: Fewer features
- xlsx-populate: Less maintained
```

#### Papa Parse

```
Pros:
+ Handles edge cases (quotes, escapes)
+ Streaming for large files
+ Auto-detect delimiters
+ Battle-tested

vs Custom parser:
- Papa Parse handles more edge cases than a custom implementation
```

---

## Bundle Considerations

### Extension Bundle

```
Core extension (no webview libs):
- TypeScript compiled
- VS Code APIs only
- Estimated: ~50KB
```

### Webview Bundles

```
Editor webview:
- Tiptap core: ~30KB gzipped
- ProseMirror deps: ~50KB gzipped
- Custom code: ~20KB
- Total: ~100KB

Kanban webview:
- dnd-kit: ~15KB gzipped
- Custom code: ~15KB
- Total: ~30KB

Viewers (loaded on demand):
- PDF.js: ~500KB (loaded from CDN)
- Mammoth: ~30KB
- SheetJS: ~300KB
- Papa Parse: ~15KB
```

---

## NPM Packages to Install

### Core Dependencies

```json
{
  "dependencies": {
    "@tiptap/core": "^2.x",
    "@tiptap/starter-kit": "^2.x",
    "@tiptap/extension-placeholder": "^2.x",
    "@tiptap/suggestion": "^2.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "mermaid": "^11.x",
    "papaparse": "^5.x"
  }
}
```

### Dev Dependencies

```json
{
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^2.x",
    "esbuild": "^0.20.x",
    "typescript": "^5.x"
  }
}
```

### CDN-loaded (not bundled)

```
- pdf.js (Mozilla CDN)
- mammoth.js (unpkg)
- xlsx (SheetJS CDN)
```

---

## Framework Decision: No React

For webviews, using **vanilla TypeScript** with Tiptap (which is framework-agnostic):

**Why no React?**
1. Tiptap works without React
2. Smaller bundle size
3. Simpler build configuration
4. VS Code webviews don't need React's features
5. dnd-kit has vanilla JS support

**If React was needed later:**
- Preact would be the choice (3KB vs 40KB)
- Same API, fraction of the size
