const request = require('supertest');
const app = require('../server'); // Ensure this path is correct
const jest = require('jest');

// Increase Jest timeout globally if needed
jest.setTimeout(10000); // 10 seconds

describe('Sign-In Endpoint Tests', () => {
  // Mock admin user credentials
  const adminCredentials = {
    email: 'john.doe@example.com', // actual admin email
    password: 'password123'        // actual admin password
  };

  // Test the POST /api/v1/auth/signin endpoint
  it('should return a token when valid credentials are provided', async () => {
    const response = await request(app)
      .post('/api/v1/auth/signin') // Ensure this route is correct
      .send(adminCredentials);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('token'); // Ensure the token property exists
  }, 10000); // Increase timeout for this test only if needed

  // Test the POST /api/v1/auth/signin endpoint with invalid credentials
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

  afterAll(async () => {
    // Ensure to close the database connection or any other open resources
    await app.close(); // This assumes your server/app has a close method to shutdown
  });
});
