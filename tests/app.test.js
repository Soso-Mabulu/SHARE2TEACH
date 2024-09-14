const request = require('supertest');
const { app, server } = require('../server'); // Adjust path if necessary
const sql = require('mssql'); // Import the mssql package used in db.js

jest.setTimeout(20000); // 10 seconds timeout for each test

describe('Sign-In Endpoint Tests', () => {
  const adminCredentials = {
    email: 'jane.doe@example.com', // Actual admin email
    password: 'password1234'        // Actual admin password
  };

  let token; // Variable to store the token

  beforeAll(async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')  // Ensure this matches your route
      .send(adminCredentials);

    // Check if sign-in was successful
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token');
    token = response.body.token; // Store the token for later use
  });

  it('should return a token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')  // Ensure this matches your route
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);  // Expect success
    expect(response.body).toHaveProperty('token');
  });

  it('should return 401 when invalid credentials are provided', async () => {
    const invalidCredentials = {
      email: 'wrong.email@example.com',
      password: 'wrongpassword'
    };

    const response = await request(app)
      .post('/api/v1/auth/login')  // Ensure this matches your route
      .send(invalidCredentials);

    expect(response.statusCode).toBe(401);  // Expect unauthorized
    expect(response.body).toHaveProperty('error', 'Invalid credentials');  // Adjust based on actual error message
  });
});

describe('Moderation Endpoint Tests', () => {
  let token;

  beforeAll(async () => {
    // Fetch a valid token using admin credentials
    const adminCredentials = {
      email: 'jane.doe@example.com',
      password: 'password1234'
    };

    const response = await request(app)
      .post('/api/v1/auth/login')  // Ensure this matches your route
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    token = response.body.token; // Store the token for later use
  });

  it('should retrieve pending documents', async () => {
    const response = await request(app)
      .get('/api/v1/documents/pending')  // Ensure this matches your route
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);  // Expect success
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body.documents).toBeInstanceOf(Array);  // Ensure the documents property is an array
  });

  // it('should approve a pending document', async () => {
  //   const docId = 13;  // Replace with an actual docId from your test database
  //   const response = await request(app)
  //     .post(`/api/v1/documents/${docId}`)
  //     .set('Authorization', `Bearer ${token}`)
  //     .send({ action: 'approve' });

  //   expect(response.statusCode).toBe(200);  // Expect success
  //   expect(response.body).toHaveProperty('message', 'Document successfully approved.');
  // });

  // it('should deny a pending document', async () => {
  //   const docId = 12;  // Replace with an actual docId from your test database
  //   const response = await request(app)
  //     .post(`/api/v1/documents/${docId}`)
  //     .set('Authorization', `Bearer ${token}`)
  //     .send({ action: 'deny' });

  //   expect(response.statusCode).toBe(200);  // Expect success
  //   expect(response.body).toHaveProperty('message', 'Document successfully denied.');
  // });

  // it('should return 400 for an invalid moderation action', async () => {
  //   const docId = 3;  // Replace with an actual docId from your test database
  //   const response = await request(app)
  //     .post(`/api/v1/documents/${docId}`)
  //     .set('Authorization', `Bearer ${token}`)
  //     .send({ action: 'invalid_action' });

  //   expect(response.statusCode).toBe(400);  // Expect bad request
  //   expect(response.body).toHaveProperty('message', 'Invalid action. Use "approve" or "deny".');
  // });

  // it('should return 404 if the document is not found or already moderated', async () => {
  //   const docId = 999;  // Use a non-existent docId
  //   const response = await request(app)
  //     .post(`/api/v1/documents/${docId}`)
  //     .set('Authorization', `Bearer ${token}`)
  //     .send({ action: 'deny' });

  //   expect(response.statusCode).toBe(404);  // Expect not found
  //   expect(response.body).toHaveProperty('message', 'Document not found or already moderated.');
  // });
});

afterAll(async () => {
  console.log('Closing server and database connection...');
  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
  
  // Ensure mssql pool is closed
  if (sql.close) {
    await sql.close();
  }
  console.log('Server and database connection closed.');
});
