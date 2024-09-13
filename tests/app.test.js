const request = require('supertest');
const { app, server } = require('../server'); // Adjust path if necessary
const sql = require('mssql'); // Import the mssql package used in db.js

jest.setTimeout(10000); // 10 seconds timeout for each test

describe('Sign-In Endpoint Tests', () => {
  const adminCredentials = {
    email: 'jane.doe@example.com', // Actual admin email
    password: 'password1234'        // Actual admin password
  };

  let token; // Variable to store the token

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/signin')
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    token = response.body.token; // Store the token for later use
  });

  it('should return a token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/api/v1/signin') // Ensure this route is correct
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
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
  describe('Moderation Endpoint Tests', () => {
    it('should retrieve pending documents', async () => {
      const response = await request(app)
        .get('/api/v1/documents/pending') // Adjust the route if necessary
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.documents).toBeInstanceOf(Array);
    });

    it('should approve a pending document', async () => {
      const docId = 7; // Replace with an actual docId from your test database
      const response = await request(app)
        .post(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'approve' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Document successfully approved.');
    });

    it('should deny a pending document', async () => {
      const docId = 2; // Replace with an actual docId from your test database
      const response = await request(app)
        .post(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'deny' });

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Document successfully denied.');
    });

    it('should return 400 for an invalid moderation action', async () => {
      const docId = 3; // Replace with an actual docId from your test database
      const response = await request(app)
        .post(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'invalid_action' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid action. Use "approve" or "deny".');
    });

    it('should return 404 if the document is not found or already moderated', async () => {
      const docId = 999; // Use a non-existent docId
      const response = await request(app)
        .post(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'deny' });

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('message', 'Document not found or already moderated.');
    });
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
