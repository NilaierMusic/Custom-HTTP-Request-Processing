const amqp = require('amqplib');
jest.mock('amqplib');

const request = require('supertest');

const { connect } = require('../utils/rabbitmq');

let m1, m2;

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

describe('Health Check Endpoints', () => {
    beforeAll(() => {
        m1 = require('../services/m1');
        m2 = require('../services/m2');
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return 200 for m1 health check', async () => {
        const res = await request(m1).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toEqual('OK');
    });

    it('should return 200 for m2 health check', async () => {
        const res = await request(m2).get('/health');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toEqual('OK');
    });
});

afterAll(() => {
    if (m1 && m1.close) m1.close(); // Close m1 if it's defined
    if (m2 && m2.close) m2.close(); // Close m2 if it's defined
});