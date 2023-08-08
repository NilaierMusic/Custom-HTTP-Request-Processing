const logger = require('../utils/logger');

module.exports = function (err, req, res, next) {
    logger.error('Internal Server Error:', err.message);
    res.status(500).send('Internal Server Error');
};