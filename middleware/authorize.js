const jwt = require('jsonwebtoken');
const { isBlacklisted } = require('../utils/tokenBlacklist');

// Middleware for role-based authorization
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req, res, next) => {
    try {
      // Get token from Authorization header
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'No token provided' });
      }

      // Check if token is blacklisted (invalidated)
      if (isBlacklisted(token)) {
        return res.status(403).json({ message: 'Forbidden: Token has been invalidated' });
      }

      // Verify the token
      const user = jwt.verify(token, process.env.JWT_SECRET);

      // Check if user role is authorized
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
      }

      // Attach user information to request object
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized', error });
    }
  };
};

module.exports = authorize;
