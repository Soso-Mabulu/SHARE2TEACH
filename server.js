const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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
  origin: [
    'https://example-frontend-domain.com', // Replace with your actual frontend domain
    'https://share2teach-backend-dev-cs4b5lzjkq-uc.a.run.app', // Google Cloud link
    'http://localhost:3000', // Allow requests from localhost for development purposes
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Restrict allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Restrict allowed headers
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
app.use(`/api/${apiVersion}/search`, searchRoutes); 
app.use(`/api/${apiVersion}/faq`, faqRoutes);
app.use(`/api/${apiVersion}/password-reset`, passwordResetRoutes);

const setupSwagger = require('./routes/swagger');
setupSwagger(app);

// Handle requests to the root path
app.get('/', (req, res) => {
  res.send(`<h1>Welcome to the Share2Teach Backend API</h1><p>Use the appropriate API endpoints to interact with the system.</p>
    <p>Refer to the <a href="/api-docs">API documentation</a> for more information.</p>`);
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger UI is available at http://localhost:${PORT}/api-docs`);
  });
}
