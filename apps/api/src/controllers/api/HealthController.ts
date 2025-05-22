import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export class HealthController {
  public registerRoutes(app: FastifyInstance): void {
    app.get('/health', this.healthCheck.bind(this));
  }

  private async healthCheck(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    return reply.send({ status: 'ok', time: new Date().toISOString() });
  }
}