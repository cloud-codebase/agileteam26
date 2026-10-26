const server = require('./src/server');

const PORT = process.env.PORT || 3000;

if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`Movie Review API server running on port ${PORT}`);
  });
}

module.exports = server;
