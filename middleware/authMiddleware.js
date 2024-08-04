// middleware/authMiddleware.js
module.exports = (req, res, next) => {
    // Check if the user is authenticated (e.g., by checking if a session or token exists)
    if (req.session && req.session.user) {
        // User is authenticated, proceed to the next middleware/route handler
        return next();
    } else {
        // User is not authenticated, return a JSON response or redirect
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        } else {
            return res.redirect('/login');
        }
    }
};
