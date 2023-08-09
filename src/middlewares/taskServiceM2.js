// Import necessary modules and utilities
const logger = require('../utils/logger');
const { connect } = require('../utils/rabbitmq');
const loadConfig = require('../config/configLoader');

// Load configuration for the RabbitMQ task queue
const DEFAULT_TASK_QUEUE = 'tasks';
const PROCESSING_DELAY = 1; // Simulating some processing delay
const TASK_QUEUE = loadConfig('QUEUE_NAMES.TASKS', DEFAULT_TASK_QUEUE);

/**
 * Process tasks from the queue.
 * @param {Object} channel - The RabbitMQ channel.
 */
// Function to handle individual messages from the task queue
async function handleMessage(channel, msg) {
    try {
        const task = JSON.parse(msg.content.toString());
        logger.info(`Received task: ${JSON.stringify(task)}`);
        
        await new Promise(resolve => setTimeout(resolve, PROCESSING_DELAY));
        
        logger.info(`Processed task: ${JSON.stringify(task)}`);
        
        channel.sendToQueue(msg.properties.replyTo, Buffer.from('Job done!'), {
            correlationId: msg.properties.correlationId
        });
        channel.ack(msg);
    } catch (error) {
        logger.error(`Error in handleMessage: ${error.message}`);
        handleTaskError(error, msg);
    }
}

// Function to process tasks from the queue
async function processTasks(channel) {
    logger.info('Setting up consumer for task queue.');
    
    channel.consume(TASK_QUEUE, async (msg) => {
        await handleMessage(channel, msg);
    });
}

// Function to handle any errors that occur while processing tasks
function handleTaskError(error, msg) {
    if (error instanceof SyntaxError) {
        logger.error(`Received malformed message: ${msg.content.toString()}`);
    } else {
        logger.error(`Error processing task: ${error.message}`);
    }
    msg.channel.nack(msg, false, false);
}

// Function to initialize task processing for M2
async function initializeTaskProcessing() {
    try {
        const channel = await connect();
        channel.assertQueue(TASK_QUEUE, { durable: true });
        
        logger.info('Initializing task processing.');
        
        await processTasks(channel);
    } catch (error) {
        logger.error(`Failed to initialize M2: ${error.message}`);
    }
}

// Export the functions for processing tasks and handling errors
module.exports = { processTasks, handleTaskError, initializeTaskProcessing, handleMessage };