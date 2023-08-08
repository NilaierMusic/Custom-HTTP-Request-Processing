const rateLimit = require('express-rate-limit');
const loadConfig = require('../config/configLoader');

const WINDOW_MS = loadConfig('RATE_LIMIT.WINDOW_MS', 900000);
const MAX_REQUESTS = loadConfig('RATE_LIMIT.MAX_REQUESTS', 100);

const limiter = rateLimit({
    windowMs: WINDOW_MS,
    max: MAX_REQUESTS,
    message: "Too many requests from this IP, please try again later."
});

module.exports = limiter;