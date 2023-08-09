// Import necessary modules and middlewares
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('../utils/logger');
const rateLimiter = require('../middlewares/rateLimiter');
const healthCheck = require('../middlewares/healthCheck');
const errorHandler = require('../middlewares/errorHandler');
const { taskHandler, setupConnectionAndConsumer, shutdownGracefully } = require('../middlewares/taskServiceM1');

// Load the desired port from configuration, with a default value of 3000 if not specified
const PORT = require('../config/configLoader')('PORT', 3000);

// Initialize an Express application
const app = express();

// Middleware for limiting the rate of requests
app.use(rateLimiter);

// Middleware for parsing JSON requests
app.use(bodyParser.json());

// Add health check endpoints to the Express application
healthCheck(app);

// Route to handle tasks
app.get('/', taskHandler);

// Setup the connection and consumer for RabbitMQ tasks
setupConnectionAndConsumer();

// Global error handling middleware
app.use(errorHandler);

// Listen for process signals and shutdown gracefully if received
process.on('SIGINT', () => shutdownGracefully('SIGINT'));
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));

// Start the Express application and listen on the specified port
const server = app.listen(PORT, () => {
    logger.info(`M1 service listening on port ${PORT}`);
});

// Export the server for potential external use (e.g., testing)
module.exports = server;