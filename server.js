const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require("./routes/uploadRoutes");

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Route handlers
app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);
app.use('/users', usersRoutes);  // Use the users route
app.use("/upload", uploadRoutes);

// Swagger setup
const setupSwagger = require('./routes/swagger');
setupSwagger(app);

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  // Vist the Swagger UI at http://localhost:3000/docs
  console.log('Swagger UI is available at http://localhost:3000/api-docs');
});
