import http from 'http';
import { app } from './app.js';

const PORT = process.env.PORT || 3000;

export const server = http.createServer(app);

// If file is run directly via node
const isMain = process.argv[1] && (
  process.argv[1].endsWith('server/index.js') ||
  process.argv[1].endsWith('server.js')
);

if (isMain) {
  server.listen(PORT, () => {
    console.log(`Movie Review API server running at http://localhost:${PORT}`);
  });
}

export default server;
