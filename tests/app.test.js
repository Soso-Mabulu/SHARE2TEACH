const request = require('supertest');
const { app, server } = require('../server'); // Adjust path if necessary
const sql = require('mssql'); // Import the mssql package used in db.js

jest.setTimeout(20000); // 20 seconds timeout for each test

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
  let adminToken;

  beforeAll(async () => {
    // Fetch a valid token using admin credentials
    const adminCredentials = {
      email: 'jane.doe@example.com', // Actual admin email
      password: 'password1234'
    };

    const adminResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(adminCredentials);

    expect(adminResponse.statusCode).toBe(200); // Expect success
    expect(adminResponse.body).toHaveProperty('token'); // Ensure token is returned
    adminToken = adminResponse.body.token; // Store the token for later use
  });

  // it('should return 200 for successful moderation action (approve)', async () => {
  //   const moderationData = {
  //     docid: 26, // Replace with an actual docid from your test database
  //     action: 'approve', // Valid action
  //   };

  //   const response = await request(app)
  //     .post('/api/v1/moderation')
  //     .set('Authorization', `Bearer ${adminToken}`)
  //     .send(moderationData);

  //   expect(response.statusCode).toBe(200);
  //   expect(response.body).toHaveProperty('message', 'Document approved successfully.');
  // });

  it('should return 400 for invalid moderation action', async () => {
    const moderationData = {
      docid: 1, // Replace with an actual docid from your test database
      action: 'invalid', // Invalid action
      comments: 'Document is not suitable for publication'
    };

    const response = await request(app)
      .post('/api/v1/moderation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(moderationData);

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty('message', 'Invalid input: docid and action are required, action must be either approve or disapprove.');
  });

  it('should return 404 if the document is not found or already moderated', async () => {
    const moderationData = {
      docid: 100, // Assuming this docid does not exist
      action: 'approve',
    };
  
    const response = await request(app)
      .post('/api/v1/moderation')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(moderationData);
  
    console.log(response.body); // Log the response body for debugging
  
    expect(response.statusCode).toBe(404);  
    expect(response.body).toHaveProperty('message', 'Document not found.'); // Ensure this matches
  });
  
});

describe('Document Rating API Testcs', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Fetch a valid token using admin credentials
    const adminCredentials = {
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const adminResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(adminCredentials);

    expect(adminResponse.statusCode).toBe(200);
    adminToken = adminResponse.body.token;

    // Fetch a valid token using public access user credentials
    const userCredentials = {
      email: 'kamogeloMol@gmail.com',
      password: 'Strawberry123'
    };

    const userResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(userCredentials);

    expect(userResponse.statusCode).toBe(200);
    userToken = userResponse.body.token;
  });

  /*it('should rate a document successfully', async () => {
    const ratingData = {
      docId:13,  // Replace with an actual docId from your test database
      userId: 17, // Replace with an actual userId from your test database
      rating: 4
    };
  
    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);
  
    console.log('Rate document response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.text).toEqual('Rating added successfully'); // Use toEqual for string comparison
  });*/
  /*it('should return 400 if document not found', async () => {
    const ratingData = {
      docId: 999,  // Non-existent docId
      userId: 17,
      rating: 4
    };

    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    expect(response.statusCode).toBe(400);
    expect(response.text).toBe('Document not found');
  });*/

  /*it('should return 400 if user has already rated the document', async () => {
    const ratingData = {
      docId: 5,
      userId: 17,
      rating: 4
    };
    const ratingData1 = {
      docId: 5,
      userId: 17,
      rating: 3
    }

    // First rating attempt
    await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    // Second rating attempt
    const response = await request(app)
      .post('/api/v1/fileRating/rate')
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData1);

    expect(response.statusCode).toBe(400);
    expect(response.text).toBe('You cannot rate the same document more than once');
  });
*/

it('should get all ratings as admin', async () => {
  const response = await request(app)
    .get('/api/v1/fileRating')
    .set('Authorization', `Bearer ${adminToken}`);

  console.log('Get all ratings response:', response.body);
  console.log('Get all ratings status:', response.statusCode);
  expect(response.statusCode).toBe(200);
  expect(response.body).toBeInstanceOf(Array);
});
/* it('should return 403 for public access user trying to get all ratings', async () => {
    const response = await request(app)
      .get('/api/v1/fileRating')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.statusCode).toBe(403);
  });*/
});

describe('FAQ API Tests', () => {
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Fetch a valid token using admin credentials
    const adminCredentials = {
      email: 'john.doe@example.com',
      password: 'password123'
    };

    const adminResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(adminCredentials);

    expect(adminResponse.statusCode).toBe(200);
    adminToken = adminResponse.body.token;

    // Fetch a valid token using public access user credentials
    const userCredentials = {
      email: 'kamogeloMol@gmail.com',
      password: 'Strawberry123'
    };

    const userResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(userCredentials);

    expect(userResponse.statusCode).toBe(200);
    userToken = userResponse.body.token;
  });

  it('should get all FAQs as admin', async () => {
    const response = await request(app)
      .get('/api/v1/faq')
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('Get all FAQs response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });

  /*it('should get all FAQs as public user', async () => {
    const response = await request(app)
      .get('/api/v1/faq')
      .set('Authorization', `Bearer ${userToken}`);

    console.log('Get all FAQs response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
  });*/

  /*it('should create a new FAQ as admin', async () => {
    const newFAQ = {
      question: 'How do I report a technical issue on SHARE2TEACH?',
      answer: 'If you encounter any technical issues, you can report them via the contact form on the website or by emailing the support team. Providing detailed information about the issue will help the team resolve it more efficiently.'
    };

    const response = await request(app)
      .post('/api/v1/faq/newfaq')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newFAQ);

    console.log('Create FAQ response:', response.body);
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.question).toBe(newFAQ.question);
    expect(response.body.answer).toBe(newFAQ.answer);
  });*/

  /*it('should update an existing FAQ as admin', async () => {
    const updatedFAQ = {
      question: 'How do I report a technical issue on SHARE2TEACH?',
      answer: 'If you encounter any technical issues, you can report them via the contact form on the website or by emailing the support team at support@share2teach.com. Providing detailed information about the issue, such as the steps to reproduce it, any error messages, and your browser or device details, will help the team resolve it more efficiently.'
    };

    const response = await request(app)
      .put('/api/v1/faq/1') // Replace with an actual faqId from your test database
      .set('Authorization', `Bearer ${adminToken}`)
      .send(updatedFAQ);

    console.log('Update FAQ response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body.question).toBe(updatedFAQ.question);
    expect(response.body.answer).toBe(updatedFAQ.answer);
  });*/

 /*it('should search FAQs', async () => {
    const searchTerm = 'SHARE';

    const response = await request(app)
      .get(`/api/v1/faq/search?term=${searchTerm}`)
      .set('Authorization', `Bearer ${userToken}`);

    console.log('Search FAQs response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body.length).toBeGreaterThan(0);
  });*/

  /*it('should delete an existing FAQ as admin', async () => {
    const response = await request(app)
      .delete('/api/v1/faq/12') // Replace with an actual faqId from your test database
      .set('Authorization', `Bearer ${adminToken}`);

    console.log('Delete FAQ response:', response.body);
    expect(response.statusCode).toBe(204);
  });*/
 /* it('should submit a rating successfully', async () => {
    const ratingData = {
      faqId: 1, // Replace with an actual faqId from your test database
      userId: 17, // Replace with an actual userId from your test database
      rating: 4
    };

    const response = await request(app)
      .post(`/api/v1/faq/rating/${ratingData.faqId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    console.log('Submit rating response:', response.body);
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('Rating submitted successfully');
  });*/

  /*it('should return 400 for invalid rating value', async () => {
    const ratingData = {
      faqId: 11, // Replace with an actual faqId from your test database
      userId: 17, // Replace with an actual userId from your test database
      rating: 6 // Invalid rating value
    };

    const response = await request(app)
      .post(`/api/v1/faq/rating/${ratingData.faqId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    console.log('Invalid rating response:', response.body);
    expect(response.statusCode).toBe(400);
    expect(response.text).toBe('Rating must be between 0 and 5');
  });*/

 /* it('should return 404 if FAQ not found', async () => {
    const ratingData = {
      faqId: 9999, // Non-existent faqId
      userId: 17, // Replace with an actual userId from your test database
      rating: 4
    };

    const response = await request(app)
      .post(`/api/v1/faq/rating/${ratingData.faqId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    console.log('FAQ not found response:', response.body);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe('FAQ not found');
  });*/

  /*it('should return 404 if user not found', async () => {
    const ratingData = {
      faqId: 1, // Replace with an actual faqId from your test database
      userId: 9999, // Non-existent userId
      rating: 4
    };

    const response = await request(app)
      .post(`/api/v1/faq/rating/${ratingData.faqId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send(ratingData);

    console.log('User not found response:', response.body);
    expect(response.statusCode).toBe(404);
    expect(response.text).toBe('User not found');
  });*/
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
