/**
 * ChessMaster1 - Node.js Express Server
 * Serves static assets from public/ and provides health check endpoint.
 * Listens on port 8080 (Cloud Run single container architecture).
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware for parsing JSON bodies
app.use(express.json());

// Request logging (concise)
app.use((req, res, next) => {
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'chessmaster1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for subpaths or client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChessMaster server listening on port ${PORT}`);
  });
}

module.exports = app;
