let app;
try {
  app = require('../server');
} catch (err) {
  console.error('Failed to load server.js in api/index.js:', err);
}

module.exports = (req, res) => {
  if (!app) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Server initialization failed' }));
  }
  return app(req, res);
};
