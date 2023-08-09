// Import necessary modules
const amqp = require('amqplib');
const loadConfig = require('../config/configLoader');
const logger = require('../utils/logger');

// Load the RabbitMQ URL from configuration, with a default value if not specified
const RABBITMQ_URL = loadConfig('RABBITMQ_URL', 'amqp://localhost');

// Define a RabbitMQ class for connection management
class RabbitMQ {
	constructor() {
		// Initialize channel instance as null
		this.channelInstance = null;

		// Bind the connect method to the instance of this class
		this.connect = this.connect.bind(this);
	}

	// Method to establish a connection to RabbitMQ
	async connect() {
		// Return existing channel instance if already connected
		if (this.channelInstance) return this.channelInstance;

		try {
			// Log the attempt to connect
			logger.info(`Attempting to connect to RabbitMQ at ${RABBITMQ_URL}.`);
			
			// Establish a connection if not already present
			if (!this.connection) {
				this.connection = await amqp.connect(RABBITMQ_URL);
			}
			// Create a channel on the established connection
			this.channelInstance = await this.connection.createChannel();
			
			// Log the successful connection and channel creation
			logger.info('Successfully connected to RabbitMQ and created channel.');
			
			return this.channelInstance;
		} catch (error) {
			// Log and throw any errors that occur during the connection process
			const errorMessage = `Failed to connect to RabbitMQ at ${RABBITMQ_URL}: ${error.message}`;
			logger.error(errorMessage);
			throw new Error(errorMessage);
		}
	}
}

// Create an instance of the RabbitMQ class
const rabbitInstance = new RabbitMQ();

// Export the connect method and connection instance for external use
module.exports = {
    connect: rabbitInstance.connect,
    connection: rabbitInstance.connection
};