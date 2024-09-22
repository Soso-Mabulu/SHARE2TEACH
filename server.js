const express = require('express');
const bodyParser = require('body-parser');
<<<<<<< HEAD
const cookieSession = require('cookie-session');
const passport = require('passport'); // Correctly require passport
require('./config/passport'); // Load Passport configuration

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require("./routes/uploadRoutes");
=======
const cors = require('cors');
const setupSwagger = require('./routes/swagger');
>>>>>>> develop

// Import routes
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploadRoutes');
const moderationRoutes = require('./routes/moderationRoutes');
const faqRoutes = require('./routes/faq');
const fileRating = require('./routes/fileRating');
const reportedFile = require('./routes/Report.js');
const documents = require('./routes/documents.js');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');


// Create express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: '*',
  credentials: true,
}));
app.use(bodyParser.json());

<<<<<<< HEAD
app.use(cookieSession({
    name: 'google-auth-session',
    keys: ['key1', 'key2']
}));

app.use(passport.initialize());
app.use(passport.session());

// Route handlers
app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);
app.use('/users', usersRoutes);
app.use("/upload", uploadRoutes);
=======
// API routes
const apiVersion = 'v1';
app.use(`/api/${apiVersion}/users`, usersRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);
app.use(`/api/${apiVersion}/faq`, faqRoutes);
app.use(`/api/${apiVersion}/report`, reportedFile);
app.use (`/api/${apiVersion}/documents`, documents);
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/moderation`, moderationRoutes);
app.use(`/api/${apiVersion}/fileRating`, fileRating);
app.use(`/api/${apiVersion}/analytics`, analyticsRoutes);

>>>>>>> develop

// Swagger setup
setupSwagger(app);

<<<<<<< HEAD
// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.log('Swagger UI is available at http://localhost:3000/api-docs');
=======
// Root endpoint
app.get('/', (req, res) => {
  res.send(`<h1>Welcome to the Share2Teach Backend API</h1>
            <p>Use the appropriate API endpoints to interact with the system.</p>
            <p>Refer to the <a href="/api-docs">API documentation</a> for more information.</p>`);
>>>>>>> develop
});

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Swagger UI is available at http://localhost:${port}/api-docs`);
});

module.exports = { app, server };
