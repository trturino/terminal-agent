import Fastify, { fastify, FastifyInstance } from 'fastify';
import { S3Client } from '@aws-sdk/client-s3';
import { Config } from './config/Config.js';
import { HealthController } from './controllers/HealthController.js';
import { DeviceController } from './controllers/DeviceController.js';
import { DeviceService } from './services/DeviceService.js';
import { FileService } from './services/FileService.js';
import { SensiblePlugin } from './plugins/SensiblePlugin.js';
import { HelmetPlugin } from './plugins/HelmetPlugin.js';
import { CompressPlugin } from './plugins/CompressPlugin.js';
import { CorsPlugin } from './plugins/CorsPlugin.js';
import { RateLimitPlugin } from './plugins/RateLimitPlugin.js';
import { SwaggerPlugin } from './plugins/SwaggerPlugin.js';
import { runMigrations } from './utils/Migrate.js';

export class App {
    private readonly server: FastifyInstance;
    private readonly config = new Config();
    private deviceService: DeviceService | null = null;
    private fileService: FileService | null = null;

    constructor() {
        const cfg = this.config;
        this.server = Fastify({
            logger: {
                level: cfg.logLevel,
                transport: cfg.nodeEnv !== 'production' ? {
                    target: 'pino-pretty',
                    options: {
                        colorize: true,
                        translateTime: 'HH:MM:ss Z',
                        ignore: 'pid,hostname',
                    }
                } : undefined,
                serializers: {
                    req: (req) => ({
                        method: req.method,
                        url: req.url,
                        hostname: req.hostname,
                        remoteAddress: req.ip,
                        remotePort: req.socket?.remotePort,
                    })
                },
            },
            disableRequestLogging: false,
            requestIdHeader: 'x-request-id',
            requestIdLogLabel: 'reqId',
        });

        // Add request logging hook
        this.server.addHook('onRequest', async (request, reply) => {
            request.log.info({ req: request }, 'Incoming request');
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
        try {
            // Initialize services with dependency injection
            const s3Config: any = {
                region: this.config.s3.region,
                endpoint: this.config.s3.endpoint,
                forcePathStyle: true,
            };

            // Add credentials if they exist in config
            if ('accessKeyId' in this.config.s3 && 'secretAccessKey' in this.config.s3) {
                s3Config.credentials = {
                    accessKeyId: (this.config.s3 as any).accessKeyId,
                    secretAccessKey: (this.config.s3 as any).secretAccessKey,
                };
            }

            const s3Client = new S3Client(s3Config);

            this.fileService = new FileService(s3Client, this.config.s3.bucketName);
            this.deviceService = new DeviceService(this.fileService);
            
            // Initialize controllers with their dependencies
            const deviceController = new DeviceController(this.deviceService, this.fileService);
            
            // Initialize controllers
            const healthController = new HealthController();
            
            // Register routes
            deviceController.registerRoutes(this.server);
            healthController.registerRoutes(this.server);
            
            this.server.log.info('Controllers registered successfully');
        } catch (error) {
            this.server.log.error(error, 'Failed to register controllers:', error);
            throw error;
        }
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
            this.server.log.info(' Shutting down...');
            await this.server.close();
            process.exit(0);
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    private async initializeDatabase(): Promise<void> {
        try {
            // Initialize the database connection
            const database = await import('./database/connection.js');
            const connection = await database.databaseConnection.getConnection();
            
            // Run migrations
            await runMigrations();
            
            // Initialize services that depend on the database
            if (this.deviceService) {
                await this.deviceService.init();
            }
            
            this.server.log.info('Database initialized successfully');
        } catch (error) {
            this.server.log.error(error, 'Failed to initialize database');
            throw error;
        }
    }

    public async start(): Promise<void> {
        try {
            await this.initializeDatabase();
            await this.registerPlugins();
            this.registerControllers();
            this.registerErrorHandler();
            this.registerShutdownHooks();

            await this.server.listen({ port: this.config.port, host: this.config.host });
            this.server.swagger();
            this.server.log.info(`Server is running on ${this.config.host}:${this.config.port}`);
        } catch (err) {
            this.server.log.error(err, 'Failed to start server');
            await this.stop();
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        try {
            // Close the HTTP server
            await this.server.close();
            
            // Close the database connection
            const database = await import('./database/connection.js');
            await database.databaseConnection.close();
            
            this.server.log.info('Server stopped successfully');
        } catch (error) {
            this.server.log.error(error, 'Error during server shutdown');
            throw error;
        }
    }
}