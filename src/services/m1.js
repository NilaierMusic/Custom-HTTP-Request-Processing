const loadConfig = require('../config/configLoader');

const PORT = loadConfig('PORT', 3000);
const callbackQueue = loadConfig('QUEUE_NAMES.CALLBACK', 'callback_queue');
const express = require('express');
const bodyParser = require('body-parser');
const { connect } = require('../utils/rabbitmq');
const logger = require('../utils/logger');

const app = express();

const rateLimiter = require('../middlewares/rateLimiter');
app.use(rateLimiter);

app.use(bodyParser.json());

let channel;
let pendingRequests = {};

const healthCheck = require('../middlewares/healthCheck');
healthCheck(app);

const errorHandler = require('../middlewares/errorHandler');
app.use(errorHandler);


app.get('/', async (req, res, next) => {
    try {
        if (!channel) {
            await setupConnectionAndConsumer();
            channel = await connect();
            if (!channel) {
                throw new Error('Failed to establish a channel with RabbitMQ');
            }
        }

        const queue = loadConfig('QUEUE_NAMES.TASKS', 'tasks');
        channel.assertQueue(queue, { durable: true });

        const correlationId = generateUuid();
        pendingRequests[correlationId] = res;

        channel.sendToQueue(queue, Buffer.from(JSON.stringify(req.query)), {
            correlationId: correlationId,
            replyTo: callbackQueue
        });
    } catch (error) {
        if (error.message.includes('Failed to connect to RabbitMQ')) {
            return res.status(503).send('Service Unavailable');
        }
        next(error);
    }
});

const setupConnectionAndConsumer = async () => {
    try {
        channel = await connect();
        if (!channel) {
            throw new Error('Failed to establish a channel with RabbitMQ');
        }

        channel.assertQueue(callbackQueue, { durable: true });
        channel.consume(callbackQueue, (msg) => {
            const correlationId = msg.properties.correlationId;
            const res = pendingRequests[correlationId];
            if (res) {
                res.send(`Result: ${msg.content.toString()}`);
                delete pendingRequests[correlationId];
            }
        }, { noAck: true });
    } catch (error) {
        logger.error('Error setting up connection and consumer:', error.message);
    }
};

setupConnectionAndConsumer();

const { v4: uuidv4 } = require('uuid');
function generateUuid() {
    return uuidv4();
}

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Internal Server Error:', err.message);
    res.status(500).send('Internal Server Error');
});

process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Shutting down gracefully.');
    if (channel) {
        const connection = channel.connection;
        await connection.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Shutting down gracefully.');
    if (channel) {
        const connection = channel.connection;
        await connection.close();
    }
    process.exit(0);
});

const server = app.listen(PORT, () => {
    logger.info(`M1 service listening on port ${PORT}`);
});

module.exports = server; // Export the server instance