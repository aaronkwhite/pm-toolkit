const esbuild = require('esbuild');
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
    entryPoints: ['webview/editor/main.ts'],
    outfile: 'dist/webview/editor.js',
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

async function main() {
  const configs = [
    extensionConfig,
    ...webviewConfigs.map(createWebviewConfig),
  ];

  if (watch) {
    // Watch mode
    const contexts = await Promise.all(
      configs.map((config) => esbuild.context(config))
    );
    await Promise.all(contexts.map((ctx) => ctx.watch()));
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
