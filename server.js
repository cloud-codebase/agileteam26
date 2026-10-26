/**
 * Entry point for Movie Review Platform server.
 */
import { server } from './server/index.js';

const PORT = process.env.PORT || 3000;

if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`Movie Review API server running on port ${PORT}`);
  });
}

export default server;
