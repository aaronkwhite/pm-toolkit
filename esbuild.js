const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Plugin for build status logging
 */
const buildStatusPlugin = {
  name: 'build-status',
  setup(build) {
    build.onStart(() => {
      console.log('[build] Starting...');
    });
    build.onEnd((result) => {
      if (result.errors.length > 0) {
        console.error('[build] Failed with errors');
      } else {
        console.log('[build] Complete');
      }
    });
  },
};

/**
 * Extension host bundle (Node.js context)
 */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  plugins: [buildStatusPlugin],
};

/**
 * Webview bundles (browser context)
 */
const webviewConfigs = [
  {
    entryPoints: ['webview/editor/index.tsx'],
    outfile: 'dist/webview/editor.js',
    jsx: 'automatic',
  },
  {
    entryPoints: ['webview/kanban/main.ts'],
    outfile: 'dist/webview/kanban.js',
  },
  {
    entryPoints: ['webview/viewers/pdf-viewer.ts'],
    outfile: 'dist/webview/pdf-viewer.js',
  },
  {
    entryPoints: ['webview/viewers/docx-viewer.ts'],
    outfile: 'dist/webview/docx-viewer.js',
  },
  {
    entryPoints: ['webview/viewers/excel-viewer.ts'],
    outfile: 'dist/webview/excel-viewer.js',
  },
  {
    entryPoints: ['webview/viewers/csv-viewer.ts'],
    outfile: 'dist/webview/csv-viewer.js',
  },
];

/**
 * CSS files to copy
 */
const cssFiles = [
  {
    src: 'webview/editor/styles/editor.css',
    dest: 'dist/webview/editor.css',
  },
  {
    src: 'webview/kanban/styles/kanban.css',
    dest: 'dist/webview/kanban.css',
  },
  {
    src: 'webview/viewers/styles/viewer.css',
    dest: 'dist/webview/viewer.css',
  },
];

/**
 * Vendor files to copy (e.g., workers that can't be bundled)
 */
const vendorFiles = [
  {
    src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
    dest: 'dist/webview/pdf.worker.min.mjs',
  },
];

/**
 * Create webview config with common options
 */
function createWebviewConfig(config) {
  return {
    ...config,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: !production,
    minify: production,
    plugins: [buildStatusPlugin],
  };
}

/**
 * Copy CSS files to dist
 */
function copyCssFiles() {
  // Ensure dist/webview directory exists
  const distDir = path.join(__dirname, 'dist', 'webview');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  for (const { src, dest } of cssFiles) {
    const srcPath = path.join(__dirname, src);
    const destPath = path.join(__dirname, dest);

    if (fs.existsSync(srcPath)) {
      let css = fs.readFileSync(srcPath, 'utf-8');

      // Minify CSS in production
      if (production) {
        css = css
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\s+/g, ' ')              // Collapse whitespace
          .replace(/\s*([{}:;,])\s*/g, '$1') // Remove space around symbols
          .trim();
      }

      fs.writeFileSync(destPath, css);
      console.log(`[css] Copied ${src} -> ${dest}`);
    } else {
      console.warn(`[css] Warning: ${src} not found`);
    }
  }
}

/**
 * Copy vendor files to dist
 */
function copyVendorFiles() {
  // Ensure dist/webview directory exists
  const distDir = path.join(__dirname, 'dist', 'webview');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  for (const { src, dest } of vendorFiles) {
    const srcPath = path.join(__dirname, src);
    const destPath = path.join(__dirname, dest);

    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`[vendor] Copied ${src} -> ${dest}`);
    } else {
      console.warn(`[vendor] Warning: ${src} not found`);
    }
  }
}

async function main() {
  const configs = [
    extensionConfig,
    ...webviewConfigs.map(createWebviewConfig),
  ];

  // Copy CSS files
  copyCssFiles();

  // Copy vendor files (PDF.js worker, etc.)
  copyVendorFiles();

  if (watch) {
    // Watch mode
    const contexts = await Promise.all(
      configs.map((config) => esbuild.context(config))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));

    // Also watch CSS files
    for (const { src, dest } of cssFiles) {
      const srcPath = path.join(__dirname, src);
      fs.watch(srcPath, () => {
        copyCssFiles();
      });
    }

    console.log('[watch] Watching for changes...');
  } else {
    // Single build
    await Promise.all(configs.map((config) => esbuild.build(config)));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
