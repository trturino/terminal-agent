import Fastify, { fastify, FastifyInstance } from 'fastify';
import { S3Client } from '@aws-sdk/client-s3';
import { Config } from './config/Config.js';
import { HealthController } from './controllers/api/HealthController.js';
import { DeviceController } from './controllers/api/DeviceController.js';
import { DeviceService } from './services/DeviceService.js';
import { FileService } from './services/FileService.js';
import { S3Service } from './services/S3Service.js';
import { PluginService } from './services/PluginService.js';
import { SensiblePlugin } from './plugins/SensiblePlugin.js';
import { HelmetPlugin } from './plugins/HelmetPlugin.js';
import { CompressPlugin } from './plugins/CompressPlugin.js';
import { CorsPlugin } from './plugins/CorsPlugin.js';
import { RateLimitPlugin } from './plugins/RateLimitPlugin.js';
import { SwaggerPlugin } from './plugins/SwaggerPlugin.js';
import { MultipartPlugin } from './plugins/MultipartPlugin.js';
import { runMigrations } from './utils/Migrate.js';
import { db } from './config/Database.js';
import { PluginController } from './controllers/internal/PluginController.js';
import { DeviceController as InternalDeviceController } from './controllers/internal/DeviceController.js';
import multipart, { ajvFilePlugin } from '@fastify/multipart';

export class App {
    private readonly server: FastifyInstance;
    private readonly config = new Config();

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
            ajv: {
                // register the multipart plugin so `isFile` is understood
                plugins: [ajvFilePlugin]
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
        await this.server.register(MultipartPlugin.plugin);
    }

    private registerControllers(): void {
        // Initialize S3 client for main application
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
        const imagesS3Service = new S3Service(s3Client, this.config.s3.imagesBucketName);
        const fileService = new FileService(imagesS3Service);
        const deviceService = new DeviceService(fileService);
        
        // Initialize S3 client for plugins
        const pluginS3Config: any = {
          region: this.config.s3.region,
          endpoint: this.config.s3.endpoint,
          forcePathStyle: true,
        };
        
        if ('accessKeyId' in this.config.s3 && 'secretAccessKey' in this.config.s3) {
          pluginS3Config.credentials = {
            accessKeyId: (this.config.s3 as any).accessKeyId,
            secretAccessKey: (this.config.s3 as any).secretAccessKey,
          };
        }
        
        const pluginS3Service = new S3Service(pluginS3Config, this.config.s3.pluginsBucketName);

        
        // Initialize PluginService with the S3 service
        const pluginService = new PluginService(pluginS3Service);
        
        // Initialize controllers with their dependencies
        const deviceController = new DeviceController(deviceService, fileService);
        const pluginController = new PluginController(pluginService);
        const internalDeviceController = new InternalDeviceController(deviceService);
        
        // Initialize controllers
        const healthController = new HealthController();
        
        // Register routes
        deviceController.registerRoutes(this.server);
        pluginController.registerRoutes(this.server);
        internalDeviceController.registerRoutes(this.server);
        healthController.registerRoutes(this.server);
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

    private async initializeDatabase(): Promise<void> {
        try {
            await runMigrations();
            this.server.log.info('Database migrations completed successfully');
        } catch (error) {
            this.server.log.error(error, 'Failed to run database migrations:');
            throw error;
        }
    }

    public async start(): Promise<void> {
        try {
            // Initialize database and run migrations
            await this.initializeDatabase();

            // Register plugins and controllers
            await this.registerPlugins();
            
            this.registerControllers();
            this.registerErrorHandler();
            this.registerShutdownHooks();

            // Start the server
            await this.server.ready();
            await this.server.listen({
                port: this.config.port,
                host: this.config.host,
            });

            this.server.log.info(`Server is running on ${this.config.host}:${this.config.port}`);
        } catch (error) {
            this.server.log.error(error, 'Failed to start server:');
            await db.close().catch(err =>
                this.server.log.error(err, 'Error closing database connection:')
            );
            process.exit(1);
        }
    }

    public async stop(): Promise<void> {
        try {
            await this.server.close();
            await db.close();
        } catch (error) {
            this.server.log.error(error, 'Error during shutdown:');
            process.exit(1);
        }
    }
}