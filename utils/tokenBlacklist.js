// Simulated in-memory blacklist for demo purposes
const blacklistedTokens = new Set();

// Add token to blacklist
const addToken = (token) => {
  blacklistedTokens.add(token);
};

// Check if token is blacklisted
const isBlacklisted = (token) => {
  return blacklistedTokens.has(token);
};

module.exports = {
  addToken,
  isBlacklisted,
};
