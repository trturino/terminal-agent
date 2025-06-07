import { FastifyInstance } from 'fastify';
import { HealthController } from '../../../src/controllers/api/HealthController.js';
import { createTestServer } from '../../utils/testUtils.js';

describe('HealthController', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    server = await createTestServer();
    const healthController = new HealthController();
    healthController.registerRoutes(server);
  });

  afterEach(async () => {
    await server.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const responseData = JSON.parse(response.payload);
      expect(responseData).toHaveProperty('status', 'ok');
      expect(responseData).toHaveProperty('timestamp');
      expect(typeof responseData.timestamp).toBe('string');
    });
  });
});
