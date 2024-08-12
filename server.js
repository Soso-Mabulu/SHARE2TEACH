const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const passport = require('passport'); // Correctly require passport
require('./config/passport'); // Load Passport configuration

const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require("./routes/uploadRoutes");

// Middleware to parse JSON bodies
app.use(bodyParser.json());

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

// Swagger setup
const setupSwagger = require('./routes/swagger');
setupSwagger(app);

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.log('Swagger UI is available at http://localhost:3000/api-docs');
});
