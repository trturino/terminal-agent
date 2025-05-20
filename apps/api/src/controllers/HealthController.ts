import { FastifyInstance } from 'fastify';

export class HealthController {
  public static register(app: FastifyInstance): void {
    app.get('/health', async (_req, reply) => {
      return reply.send({ status: 'ok', time: new Date().toISOString() });
    });
  }
}