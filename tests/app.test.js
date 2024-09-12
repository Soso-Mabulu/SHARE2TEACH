const request = require('supertest');
const { app, server } = require('../server'); // Adjust path if necessary
const sql = require('mssql'); // Import the mssql package used in db.js

jest.setTimeout(10000); // 10 seconds timeout for each test

describe('Sign-In Endpoint Tests', () => {
  const adminCredentials = {
    email: 'john.doe@example.com', // Actual admin email
    password: 'password123'        // Actual admin password
  };

  it('should return a token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/api/v1/signin') // Ensure this route is correct
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token'); // Ensure the token property exists
  });

  it('should return 401 when invalid credentials are provided', async () => {
    const invalidCredentials = {
      email: 'wrong.email@example.com', // Invalid email
      password: 'wrongpassword'          // Invalid password
    };

    const response = await request(app)
      .post('/api/v1/signin') // Ensure this route is correct
      .send(invalidCredentials);

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials'); // Adjust based on your actual error message
  });

  // Ensure server and database pool are closed after all tests
  afterAll(async () => {
    // Close the server
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Close the mssql pool without modifying db.js
    if (sql.close) {
      await sql.close(); // Close the pool if it is available
    }
  });
});
