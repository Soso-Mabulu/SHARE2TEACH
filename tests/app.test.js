const request = require('supertest');
const { app, server } = require('../server'); // Adjust path if necessary

jest.setTimeout(10000); // 10 seconds

describe('Sign-In Endpoint Tests', () => {
  const adminCredentials = {
    email: 'john.doe@example.com', // Actual admin email
    password: 'password123'        // Actual admin password
  };

  let token; // Variable to store the token

  it('should return a token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signin') // Ensure this route is correct
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token'); // Ensure the token property exists

    token = response.body.token; // Store the token for later use
  });

  it('should return 401 when invalid credentials are provided', async () => {
    const invalidCredentials = {
      email: 'wrong.email@example.com', // Invalid email
      password: 'wrongpassword'          // Invalid password
    };

    const response = await request(app)
      .post('/api/v1/auth/signin') // Ensure this route is correct
      .send(invalidCredentials);

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials'); // Adjust based on your actual error message
  });

  // Additional tests can use the token here
  it('should access a protected route with the token', async () => {
    const response = await request(app)
      .get('/api/v1/users') // Replace with your actual protected route
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    //expect(response.body).toHaveProperty('data'); // Adjust based on your actual response structure
  });

  afterAll(done => {
    server.close(done); // Close the server after tests are complete
  });
});
