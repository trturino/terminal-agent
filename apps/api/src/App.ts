import Fastify, { FastifyInstance } from 'fastify';
import { Config } from './config/Config.js';
import { HealthController } from './controllers/HealthController.js';
import { SensiblePlugin } from './plugins/SensiblePlugin.js';
import { HelmetPlugin } from './plugins/HelmetPlugin.js';
import { CompressPlugin } from './plugins/CompressPlugin.js';
import { CorsPlugin } from './plugins/CorsPlugin.js';
import { RateLimitPlugin } from './plugins/RateLimitPlugin.js';
import { SwaggerPlugin } from './plugins/SwaggerPlugin.js';

export class App {
    private readonly server: FastifyInstance;
    private readonly config = new Config();

    constructor() {
        const cfg = this.config;
        this.server = Fastify({
            logger: {
                level: cfg.logLevel,
                ...(cfg.nodeEnv !== 'production'
                    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
                    : {}),
            },
        });
    }

    private async registerPlugins(): Promise<void> {
        await this.server.register(SensiblePlugin.plugin);
        await this.server.register(CorsPlugin.plugin);
        await this.server.register(HelmetPlugin.plugin);
        await this.server.register(CompressPlugin.plugin);
        await this.server.register(RateLimitPlugin.plugin);
        await this.server.register(SwaggerPlugin.plugin);
    }

    private registerControllers(): void {
        HealthController.register(this.server);
    }

    private registerErrorHandler(): void {
        this.server.setErrorHandler((error, _req, reply) => {
            this.server.log.error(error);
            const status =
                error.statusCode && error.statusCode >= 400 && error.statusCode < 600
                    ? error.statusCode
                    : 500;
            reply.status(status).send({
                error: status === 500 ? 'Internal Server Error' : error.message,
            });
        });
    }

    private registerShutdownHooks(): void {
        const shutdown = async () => {
            this.server.log.info('🛑 Shutting down...');
            await this.server.close();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    public async start(): Promise<void> {
        await this.registerPlugins();
        this.registerControllers();
        this.registerErrorHandler();
        this.registerShutdownHooks();

        await this.server.listen({
            port: this.config.port,
            host: this.config.host,
        });
        this.server.log.info(
            `🚀 Server listening on http://${this.config.host}:${this.config.port}`
        );
    }
}