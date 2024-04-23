// Import required modules and mock external dependencies
const amqp = require('amqplib');
jest.mock('amqplib');
const axios = require('axios');
const { connect } = require('../utils/rabbitmq');
const { processTasks, handleTaskError, handleMessage } = require('../middlewares/taskServiceM2');

let m1, m2;

// Test suite for RabbitMQ connections
describe('RabbitMQ Connection', () => {
	beforeAll(() => {
		const mockChannel = {
			assertQueue: jest.fn(),
			sendToQueue: jest.fn(),
			consume: jest.fn()
		};

		const mockConnection = {
			createChannel: jest.fn().mockResolvedValue(mockChannel)
		};

		amqp.connect.mockResolvedValue(mockConnection);
	});

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should throw an error if connection to RabbitMQ fails', async () => {
        amqp.connect.mockRejectedValueOnce(new Error('Failed to connect to RabbitMQ'));

        await expect(connect()).rejects.toThrow('Failed to connect to RabbitMQ');
    });
	
    it('should successfully connect to RabbitMQ', async () => {
        await expect(connect()).resolves.toBeDefined();
    });
});

// Test suite for health check endpoints
describe('Health Check Endpoints', () => {
    beforeAll(() => {
        m1 = require('../services/m1');
        m2 = require('../services/m2');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 for m1 health check', async () => {
        const res = await axios.get(`http://localhost:${m1.address().port}/health`);
        expect(res.status).toEqual(200);
        expect(res.data).toEqual('OK');
    });

    it('should return 200 for m2 health check', async () => {
        const res = await axios.get(`http://localhost:${m2.address().port}/health`);
        expect(res.status).toEqual(200);
        expect(res.data).toEqual('OK');
    });
});

// Test suite for task processing
describe('Task Processing', () => {
    it('should process a task and send a response to the callback queue', async () => {
        const mockTask = { task: 'test' };
		const mockChannel = {
			assertQueue: jest.fn(),
			sendToQueue: jest.fn(),
			consume: jest.fn(),
            ack: jest.fn()  // Add the missing mock method
		};
        const mockMsg = {
            content: Buffer.from(JSON.stringify(mockTask)),
            properties: {
                replyTo: 'callback_queue',
                correlationId: 'test-id'
            },
			channel: mockChannel
        };

        // Directly test the handleMessage function
        await handleMessage(mockChannel, mockMsg);

        expect(mockChannel.sendToQueue).toHaveBeenCalledWith(
            'callback_queue',
            Buffer.from('Job done!'),
            { correlationId: 'test-id' }
        );
        expect(mockChannel.ack).toHaveBeenCalledWith(mockMsg);
    });
});

// Test suite for error handling during task processing
describe('Error Handling', () => {
    it('should handle malformed messages', async () => {
        const mockChannel = {
            nack: jest.fn()
        };
		const mockMsg = {
			content: Buffer.from('malformed message'),
			properties: {},
			channel: mockChannel
		};

        handleTaskError(new SyntaxError(), mockMsg);

        expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, false);
    });

    it('should handle task processing errors', async () => {
        const mockChannel = {
            nack: jest.fn()
        };
        const mockMsg = {
            content: Buffer.from(JSON.stringify({ task: 'test' })),
            properties: {},
			channel: mockChannel
        };

        handleTaskError(new Error('Test error'), mockMsg);

        expect(mockChannel.nack).toHaveBeenCalledWith(mockMsg, false, false);
    });
});

// Cleanup resources after all tests
afterAll(async () => {
    if (m1 && m1.close) await m1.close();
    if (m2 && m2.close) await m2.close();
    // Close RabbitMQ connections
    const rabbitmq = require('../utils/rabbitmq');
    if (rabbitmq.connection) await rabbitmq.connection.close();
});