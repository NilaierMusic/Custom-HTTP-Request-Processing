const { connect } = require('../utils/rabbitmq');

// Variable to hold the RabbitMQ channel instance
let channel;

// Function to ensure a connection to RabbitMQ and get a channel instance
const ensureChannelConnection = async () => {
    if (!channel) {
        channel = await connect();
        if (!channel) {
            throw new Error('Failed to establish a channel with RabbitMQ');
        }
    }
    return channel;
};

// Export the functions to ensure connection and retrieve the channel instance
module.exports = {
    ensureChannelConnection,
    getChannel: () => channel
};