// Import logger utility
const logger = require('../utils/logger');

// Middleware to handle errors globally
module.exports = function (err, req, res, next) {
    // Log the error message
    logger.error('Internal Server Error:', err.message);
    // Send a 500 response (Internal Server Error) to the client
    res.status(500).send('Internal Server Error');
};