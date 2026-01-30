/**
 * Test Harness Server
 *
 * Express server that serves the test harness HTML and static assets
 * for Playwright E2E testing.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.TEST_PORT || 3333;

// Root of the project
const projectRoot = path.resolve(__dirname, '../..');

// Serve the test harness HTML at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'test-harness.html'));
});

// Serve bundled JS and CSS from dist/
app.use('/dist', express.static(path.join(projectRoot, 'dist')));

// Health check endpoint for wait-on
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`[test-harness] Server running at http://localhost:${PORT}`);
  console.log(`[test-harness] Serving assets from: ${projectRoot}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('[test-harness] Shutting down...');
  server.close(() => {
    console.log('[test-harness] Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('[test-harness] Shutting down...');
  server.close(() => {
    console.log('[test-harness] Server closed');
    process.exit(0);
  });
});

export { app, server };
