// Import necessary modules and middlewares
const express = require('express');
const logger = require('../utils/logger');
const { connect } = require('../utils/rabbitmq');
const loadConfig = require('../config/configLoader');
const rateLimiter = require('../middlewares/rateLimiter');
const healthCheck = require('../middlewares/healthCheck');
const errorHandler = require('../middlewares/errorHandler');
const { initializeTaskProcessing } = require('../middlewares/taskServiceM2');

// Load the port for the M2 service from configuration, with a fallback to a default value
const PORT_M2 = loadConfig('PORT_M2', loadConfig('PORT', 4000));

// Initialize an Express application
const app = express();

// Middleware for limiting the rate of requests
app.use(rateLimiter);

// Global error handling middleware
app.use(errorHandler);

// Add health check endpoints to the Express application
healthCheck(app);

// Initialize RabbitMQ task processing for M2
initializeTaskProcessing();

// Start the Express application and listen on the specified port
const server = app.listen(PORT_M2, () => {
    logger.info(`M2 service listening on port ${PORT_M2}`);
});

// Export the server for potential external use (e.g., testing)
module.exports = server;