const jwt = require('jsonwebtoken');

/**
 * Optional auth for marketplace SSE — guests allowed.
 */
function marketSseMiddleware(req, res, next) {
  const token = req.query.token || (req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null);

  if (!token) {
    req.user = { role: 'guest', id: null };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    req.user = { role: 'guest', id: null };
    next();
  }
}

module.exports = marketSseMiddleware;
