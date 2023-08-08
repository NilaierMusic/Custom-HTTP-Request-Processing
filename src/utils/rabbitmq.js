const loadConfig = require('../config/configLoader');

const RABBITMQ_URL = loadConfig('RABBITMQ_URL', 'amqp://localhost');
const amqp = require('amqplib');
const logger = require('../utils/logger');

async function connect() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        return channel;
    } catch (error) {
        logger.error('Failed to connect to RabbitMQ:', error.message);
        throw error;
    }
}

module.exports = { connect };