const jwt = require('jsonwebtoken');

/**
 * Auth for SSE: token via ?token= (EventSource cannot set Authorization header).
 */
function sseAuthMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  const queryToken = req.query.token;
  let token = queryToken;

  if (!token && header?.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (!['admin', 'superadmin', 'inspector'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Command center access required' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = sseAuthMiddleware;
