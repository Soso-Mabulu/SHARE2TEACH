const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require("./routes/uploadRoutes");
const searchRoutes = require("./routes/searchDocuments");
const moderationRoutes = require('./routes/moderationRoutes');
const faqRoutes = require('./routes/faq');
const passwordResetRoutes = require('./routes/passreset');

const app = express();

// Use the cors middleware with specific configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin, like mobile apps or curl
    if (!origin) return callback(null, true);
    // Define a list of allowed origins
    const allowedOrigins = [
      'https://example-frontend-domain.com',
      'https://share2teach-backend-dev-cs4b5lzjkq-uc.a.run.app',
      'http://localhost:3000'
    ];
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(bodyParser.json());

const apiVersion = 'v1';

app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/protected`, protectedRoutes);
app.use(`/api/${apiVersion}/users`, usersRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/search`, searchRoutes);
app.use(`/api/${apiVersion}/documents`, moderationRoutes);
app.use(`/api/${apiVersion}/faq`, faqRoutes);
app.use(`/api/${apiVersion}/password-reset`, passwordResetRoutes);

const setupSwagger = require('./routes/swagger');
setupSwagger(app);

// Handle requests to the root path
app.get('/', (req, res) => {
  res.send(`<h1>Welcome to the Share2Teach Backend API</h1><p>Use the appropriate API endpoints to interact with the system.</p>
    <p>Refer to the <a href="/api-docs">API documentation</a> for more information.</p>`);
});

// Export the app and server for use in tests
const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.log(`Swagger UI is available at http://localhost:${process.env.PORT || 3000}/api-docs`);
});

module.exports = { app, server };
