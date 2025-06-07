import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IController } from '../IController.js';

export class HealthController implements IController {
  public registerRoutes(app: FastifyInstance): void {
    app.get('/health', this.healthCheck.bind(this));
  }

  private async healthCheck(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  }
}