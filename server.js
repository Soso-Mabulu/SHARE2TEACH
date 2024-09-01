const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Import the cors middleware

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploadRoutes');
const searchRoutes = require('./routes/searchDocuments');
const moderationRoutes = require('./routes/moderationRoutes');
const faqRoutes = require('./routes/faq');
const passwordResetRoutes = require('./routes/passreset');

const app = express();

// CORS configuration to allow all origins
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies and authentication headers
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Swagger UI is available at http://localhost:${PORT}/api-docs`);
});

module.exports = app;
