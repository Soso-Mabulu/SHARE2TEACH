const jwt = require('jsonwebtoken');

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

      // Verify the token
      const user = await new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
          if (err) {
            return reject('Invalid token');
          }
          resolve(decoded);
        });
      });

      // Log the decoded user object
      console.log('Decoded user from token:', user);

      // Check if user role is authorized
      if (roles.length && !roles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
      }

      // Attach user information (including userId) to request object
      req.user = {
        userId: user.id,// Extract the userId from the token
        role: user.userType // Extract role (or any other data in the token)
      };

      console.log('User ID attached to request:', req.user.userId); // Log the userId
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(401).json({ message: 'Unauthorized', error });
    }
  };
};

module.exports = authorize;
