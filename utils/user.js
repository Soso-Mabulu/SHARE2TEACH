// utils/user.js
const db = require('../config/db'); // Import your MySQL config

const createUser = (user) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO User (userName, userLName, email, userPassword, userType) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [user.userName, user.userLName, user.email, user.userPassword, user.userType], (err, results) => {
      if (err) return reject(err);
      resolve(results.insertId);
    });
  });
};

const findUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM User WHERE email = ?';
    db.query(query, [email], (err, results) => {
      if (err) return reject(err);
      resolve(results[0]);
    });
  });
};

module.exports = { createUser, findUserByEmail };
