const db = require('../config/db');

const createUser = async (user) => {
  const { firstName, lastName, email, hashedPassword, userRole } = user;
  const sql = 'INSERT INTO users (first_name, last_name, email, password, role) VALUES (?, ?, ?, ?, ?)';
  await db.execute(sql, [firstName, lastName, email, hashedPassword, userRole]);
};

const findUserByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ?';
  const [rows] = await db.execute(sql, [email]);
  return rows[0];
};

module.exports = { createUser, findUserByEmail };
