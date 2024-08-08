const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');

// Swagger setup
const setupSwagger = require('./routes/swagger');
setupSwagger(app);

app.use(bodyParser.json());
app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
