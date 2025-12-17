/**
 * Middleware to ensure users can only access their own client's data
 * Requires authenticate middleware to run first
 */
function authorizeClient(req, res, next) {
  if (!req.user || !req.user.clientId) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Add clientId filter helper to request
  req.clientFilter = { clientId: req.user.clientId };

  next();
}

/**
 * Helper to validate that a resource belongs to the user's client
 * Usage: await validateClientOwnership(req, resource)
 */
async function validateClientOwnership(req, resource) {
  if (!resource) {
    throw new Error('Resource not found');
  }

  if (resource.clientId !== req.user.clientId) {
    throw new Error('Access denied to this resource');
  }

  return true;
}

module.exports = { authorizeClient, validateClientOwnership };
