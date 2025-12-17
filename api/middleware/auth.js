const { verifyToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT token and attach user info to request
 * Sets req.user = { userId, clientId, email }
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // Attach user info to request
  req.user = {
    userId: decoded.userId,
    clientId: decoded.clientId,
    email: decoded.email
  };

  next();
}

module.exports = { authenticate };
