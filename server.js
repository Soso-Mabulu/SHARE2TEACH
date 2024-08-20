const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const usersRoutes = require('./routes/users');
const uploadRoutes = require("./routes/uploadRoutes");

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Versioning
const apiVersion = 'v2';

// Route handlers with versioning
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/protected`, protectedRoutes);
app.use(`/api/${apiVersion}/users`, usersRoutes);
app.use(`/api/${apiVersion}/upload`, uploadRoutes);

// Swagger setup
const setupSwagger = require('./routes/swagger');
setupSwagger(app);

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
  console.log(`Swagger UI is available at http://localhost:${process.env.PORT || 3000}/api-docs`);
});
