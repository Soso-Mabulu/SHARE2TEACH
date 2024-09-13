const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const setupSwagger = require('./routes/swagger');

// Load environment variables from .env file
dotenv.config();

// Import routes
const signupRoutes = require('./routes/signup');
const signinRoutes = require('./routes/signin');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchDocuments');
const moderationRoutes = require('./routes/moderationRoutes');
const faqRoutes = require('./routes/faq');
const passwordResetRoutes = require('./routes/passreset');

// Create express app
const app = express();

// Middleware
app.use(helmet());  // Adds security headers
app.use(cors({
  origin: '*',  // Adjust this to specific domains for better security in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true,
}));
app.use(bodyParser.json());

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/signup`, signupRoutes);
app.use(`/api/${apiVersion}/signin`, signinRoutes);
app.use(`/api/${apiVersion}/protected`, protectedRoutes);
app.use(`/api/${apiVersion}/users`, usersRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/search`, searchRoutes);
app.use(`/api/${apiVersion}/documents`, moderationRoutes);
app.use(`/api/${apiVersion}/faq`, faqRoutes);
app.use(`/api/${apiVersion}/password-reset`, passwordResetRoutes);

// Swagger setup
setupSwagger(app);

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the Share2Teach Backend API</h1>
    <p>Use the appropriate API endpoints to interact with the system.</p>
    <p>Refer to the <a href="/api-docs">API documentation</a> for more information.</p>
  `);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal Server Error',
  });
});

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});

// Graceful shutdown on SIGINT/SIGTERM
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Gracefully shutting down...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

module.exports = { app, server };
