// utils/jwt.js
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.userId, role: user.userType }, 
    process.env.JWT_SECRET, 
    { expiresIn: '3h' }
  );
};

module.exports = generateToken;
