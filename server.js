const express = require('express');
const path = require('path');
const app = express();
const uploadRouter = require('./routes/upload');

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files (if needed)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware for form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Route for rendering the upload form
app.get('/upload', (req, res) => {
    res.render('upload');
});

// Use upload routes
app.use('/upload', uploadRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
