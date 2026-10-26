const http = require('http');
const { app, expressApp, nativeHandler } = require('./app');

const PORT = process.env.PORT || 3000;

const handler = expressApp || nativeHandler;
const server = http.createServer(handler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Movie Review API server running on http://localhost:${PORT}`);
  });
}

module.exports = server;
