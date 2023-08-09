// Import necessary modules and utilities
const { v4: uuidv4 } = require('uuid');
const { ensureChannelConnection, getChannel } = require('../middlewares/rabbitmqService');
const logger = require('../utils/logger');
const loadConfig = require('../config/configLoader');

// Load configurations for RabbitMQ queues
const TASK_QUEUE = loadConfig('QUEUE_NAMES.TASKS', 'tasks');
const CALLBACK_QUEUE = loadConfig('QUEUE_NAMES.CALLBACK', 'callback_queue');
// Object to hold pending requests
const pendingRequests = {};

// Express middleware to handle incoming tasks and send them to RabbitMQ
const taskHandler = async (req, res, next) => {
    try {
        await ensureChannelConnection();
        const channel = getChannel();
        channel.assertQueue(TASK_QUEUE, { durable: true });

        const correlationId = uuidv4();
        pendingRequests[correlationId] = res;

        logger.info(`Sending task with correlationId: ${correlationId} to RabbitMQ.`);
        
        channel.sendToQueue(TASK_QUEUE, Buffer.from(JSON.stringify(req.query)), {
            correlationId,
            replyTo: CALLBACK_QUEUE
        });
    } catch (error) {
        logger.error(`Error in taskHandler: ${error.message}`);
        next(error);
    }
};

// Function to setup a connection to RabbitMQ and initialize the consumer for the callback queue
const setupConnectionAndConsumer = async () => {
    try {
        await ensureChannelConnection();
        const channel = getChannel();
        channel.assertQueue(CALLBACK_QUEUE, { durable: true });
        
        logger.info('Setting up consumer for callback queue.');
        
		channel.consume(CALLBACK_QUEUE, (msg) => {
			const correlationId = msg.properties.correlationId;
			const res = pendingRequests[correlationId];
			if (res) {
				logger.info(`Sending response for correlationId: ${correlationId}.`);
				res.send(`Result: ${msg.content.toString()}`);
				delete pendingRequests[correlationId];
				channel.ack(msg);  // Acknowledge the message
			} else {
				logger.warn(`No pending request found for correlationId: ${correlationId}.`);
				channel.nack(msg);  // Not acknowledge the message
			}
		});
    } catch (error) {
        logger.error(`Error in setupConnectionAndConsumer: ${error.message}`);
    }
};

// Function to shutdown the service gracefully
const shutdownGracefully = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully.`);
    const channel = getChannel();
    if (channel) {
        await channel.close();
        const connection = channel.connection;
        if (connection) {
            await connection.close();
        }
    }
};

// Export the middlewares and utility functions
module.exports = { taskHandler, setupConnectionAndConsumer, shutdownGracefully };