const logger = require('../utils/logger');
const express = require('express');
const { connect } = require('../utils/rabbitmq');
const loadConfig = require('../config/configLoader');  // Import the centralized configuration loader

const app = express();

const rateLimiter = require('../middlewares/rateLimiter');
app.use(rateLimiter);

// Configuration Loading
function loadConfiguration() {
    return {
        PORT_M2: loadConfig('PORT_M2', loadConfig('PORT', 3000)),
        TASK_QUEUE: loadConfig('QUEUE_NAMES.TASKS', 'tasks')
    };
}

const { PORT_M2, TASK_QUEUE } = loadConfiguration();

const healthCheck = require('../middlewares/healthCheck');
healthCheck(app);

const errorHandler = require('../middlewares/errorHandler');
app.use(errorHandler);


async function processTasks(channel) {
    channel.consume(TASK_QUEUE, async (msg) => {
        try {
            const task = JSON.parse(msg.content.toString());
            await new Promise(resolve => setTimeout(resolve, 2000)); // Simulating some processing delay
            logger.info('Processed task:', task);

            channel.sendToQueue(msg.properties.replyTo, Buffer.from('Job done!'), {
                correlationId: msg.properties.correlationId
            });
            channel.ack(msg);
        } catch (error) {
            handleTaskError(error, msg);
        }
    });
}

function handleTaskError(error, msg) {
    if (error instanceof SyntaxError) {
        logger.error('Received malformed message:', {
            messageContent: msg.content.toString(),
            errorStack: error.stack
        });
        msg.channel.nack(msg);
    } else {
        logger.error('Error processing task:', {
            errorMessage: error.message,
            taskDetails: msg.content.toString(),
            errorStack: error.stack
        });
        msg.channel.nack(msg, false, false);
    }
}

function handleMalformedMessageError(error, msg) {
    logger.error('Received malformed message:', msg.content.toString());
    msg.channel.nack(msg);
}

function handleProcessingError(error, msg) {
    logger.error('Error processing task:', error.message);
    msg.channel.nack(msg, false, false);
}

(async function initialize() {
    try {
        const channel = await connect();
        channel.assertQueue(TASK_QUEUE, { durable: true });
        await processTasks(channel);
    } catch (error) {
        logger.error('Failed to initialize M2:', error.message);
    }
})();

const server = app.listen(PORT_M2, () => {
    logger.info(`M2 service listening on port ${PORT_M2}`);
});

module.exports = server;