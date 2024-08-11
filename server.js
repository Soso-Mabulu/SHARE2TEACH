// server.js

const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const protectedRoutes = require('./routes/protected');
const fileCheckRoutes = require('./routes/fileCheck'); // Add this line

const app = express();

app.use(bodyParser.json());
app.use('/auth', authRoutes);
app.use('/protected', protectedRoutes);
app.use('/', fileCheckRoutes); // Add this line

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
