let app;
let initError = null;

try {
  app = require('../server');
} catch (err) {
  initError = {
    message: err.message,
    stack: err.stack,
    name: err.name
  };
  console.error('Failed to load server.js in api/index.js:', err);
}

module.exports = (req, res) => {
  if (!app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Server initialization failed',
      details: initError
    }, null, 2));
  }
  return app(req, res);
};
