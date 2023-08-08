const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    ],
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.simple()
        ),
    }));
}

// Listen for errors on the logger
logger.on('error', (error) => {
    console.error('Error occurred in logger:', error);
});

module.exports = logger;