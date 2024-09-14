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
});

/*describe('Moderation Endpoint Tests', () => {
  let token;

  beforeAll(async () => {
    // Fetch a valid token using admin credentials
    const adminCredentials = {
      email: 'jane.doe@example.com',
      password: 'password1234'
    };

    const response = await request(app)
      .post('/api/v1/signin')  // Ensure this matches your route
      .send(adminCredentials);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('message', 'Document successfully denied.');
    });

  it('should retrieve pending documents', async () => {
    const response = await request(app)
      .get('/api/v1/documents/pending')  // Ensure this matches your route
      .set('Authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(200);  // Expect success
    expect(response.body).toHaveProperty('status', 'success');
    expect(response.body.documents).toBeInstanceOf(Array);  // Ensure the documents property is an array
  });
*/
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

   /*   expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message', 'Invalid action. Use "approve" or "deny".');
    });

    it('should return 404 if the document is not found or already moderated', async () => {
      const docId = 999; // Use a non-existent docId
      const response = await request(app)
        .post(`/api/v1/documents/${docId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'deny' });

  //   expect(response.statusCode).toBe(404);  // Expect not found
  //   expect(response.body).toHaveProperty('message', 'Document not found or already moderated.');
  // });
//});

/*jest.setTimeout(20000); // 20 seconds timeout for each test

describe('File Rating Tests with User Authentication', () => {
  const userCredentials = {
    email: 'rode@gmail.com', // Actual user email for authentication
    password: 'password12345'   // Actual user password for authentication
  };

  const adminCredentials = {
    email: 'john.doe@example.com', // Actual admin email for authentication
    password: 'password1234'    // Actual admin password for authentication
  };

  let userToken; // Variable to store the user token
  let adminToken; // Variable to store the admin token

  beforeAll(async () => {
    // Sign up a new user
    await request(app)
      .post('/api/v1/signup') // Ensure this route is correct
      .send({
        userName: 'Lerato',
        userLName: 'Rode',
        email: userCredentials.email,
        password: userCredentials.password
      });

    // Sign in as the new user
    const userResponse = await request(app)
      .post('/api/v1/signin') // Ensure this route is correct
      .send(userCredentials);

    expect(userResponse.statusCode).toBe(200);
    expect(userResponse.body).toHaveProperty('token');
    userToken = userResponse.body.token; // Store the user token for later use

    // Sign in as admin
    const adminResponse = await request(app)
      .post('/api/v1/signin') // Ensure this route is correct
      .send(adminCredentials);

    expect(adminResponse.statusCode).toBe(200);
    expect(adminResponse.body).toHaveProperty('token');
    adminToken = adminResponse.body.token; // Store the admin token for later use
  });*/

  /*it('should submit a rating for a document', async () => {
    const valid_user_id = 2; // Replace with a valid userId
    const valid_doc_id = 3; // Replace with a valid documentId
    const response = await request(app)
      .post('/api/v1/fileRating/rate') // Ensure this route is correct
      .set('Authorization', `Bearer ${userToken}`) // Include the user token in the header
      .send({ userId: valid_user_id, docId: valid_doc_id, rating: 5 });

    console.log('Submit Rating Response:', response.body); // Log response for debugging

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Rating added successfully'); // Adjust based on actual response structure
  });

  it('should return 400 for invalid rating', async () => {
    const valid_user_id = 2;
    const valid_doc_id = 3;
    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: valid_user_id, docId: valid_doc_id, rating: 10 }); // Invalid rating

    console.log('Invalid Rating Response:', response.body);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Rating must be between 0 and 5'); // Adjust based on actual response structure
  });

  it('should return 400 if document is not found', async () => {
    const valid_user_id = 2;
    const invalid_doc_id = 9999; // Replace with an invalid documentId
    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: valid_user_id, docId: invalid_doc_id, rating: 5 });

    console.log('Document Not Found Response:', response.body);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Document not found'); // Adjust based on actual response structure
  });

  it('should return 400 if the user has already rated the document', async () => {
    const valid_user_id = 2;
    const valid_doc_id = 3;

    // First submit a valid rating
    await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: valid_user_id, docId: valid_doc_id, rating: 5 });

    // Try to submit another rating for the same document
    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ userId: valid_user_id, docId: valid_doc_id, rating: 4 });

    console.log('Duplicate Rating Response:', response.body);

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('You cannot rate the same document more than once'); // Adjust based on actual response structure
  });

  it('should get all ratings as admin', async () => {
    const response = await request(app)
      .get('/api/v1/fileRating')
      .set('Authorization', `Bearer ${adminToken}`); // Include the admin token in the header

    console.log('Get All Ratings Response:', response.body);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true); // Ensure the response is an array
  });
});*/

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
//});
