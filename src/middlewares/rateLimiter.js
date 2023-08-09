// Import necessary modules
const rateLimit = require('express-rate-limit');
const loadConfig = require('../config/configLoader');

// Load rate limit configurations
const WINDOW_MS = loadConfig('RATE_LIMIT.WINDOW_MS', 900000);
const MAX_REQUESTS = loadConfig('RATE_LIMIT.MAX_REQUESTS', 100);

// Configure and initialize the rate limiter
const limiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    message: "Too many requests from this IP, please try again later."
});

// Export the rate limiter middleware
module.exports = limiter;