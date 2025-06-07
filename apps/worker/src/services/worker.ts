import { Config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { JobProcessor } from './jobProcessor.js';
import {
  ScreenshotService,
  S3Service,
  QueueName,
  PluginFileService,
  ScreenshotQueueJob,
  ProcessedScreenshotResult,
  IQueueService,
  QueueService
} from '@terminal-agent/shared';
import { S3Client } from '@aws-sdk/client-s3';
import { Liquid } from 'liquidjs';
import { BrowserPool } from './browserPool.js';
import { Job } from 'bullmq';

const loggerWithContext = logger.child({ module: 'worker' });

export class Worker {
  private isRunning: boolean = false;
  private queue: IQueueService<ScreenshotQueueJob, ProcessedScreenshotResult>;
  private jobProcessor: JobProcessor;
  private screenshotService: ScreenshotService;
  private pluginFileService: PluginFileService;
  private config = Config.getInstance().config;
  private browserPool: BrowserPool;

  constructor() {
    const s3Client = new S3Client({
      forcePathStyle: this.config.aws.forcePathStyle,
    });

    const s3Service = new S3Service(
      s3Client,
      this.config.aws.bucket
    );

    const pluginS3Service = new S3Service(
      s3Client,
      this.config.aws.pluginsBucket
    );

    this.screenshotService = new ScreenshotService(s3Service);
    this.pluginFileService = new PluginFileService(pluginS3Service);


    // Initialize browser pool with config
    this.browserPool = new BrowserPool(this.config.browserPool);

    // Initialize the message queue
    this.queue = new QueueService<ScreenshotQueueJob, ProcessedScreenshotResult>(
      QueueName.SCREENSHOT_JOBS,
      this.config.redis,
      this.processJob.bind(this)
    );

    loggerWithContext.info({
      redisHost: this.config.redis.host,
      redisPort: this.config.redis.port,
      queueName: QueueName.SCREENSHOT_JOBS,
      browserPoolSize: this.config.browserPool.poolSize
    }, 'Worker initialized with configuration');

    // Initialize job processor with dependencies
    this.jobProcessor = new JobProcessor(
      this.screenshotService,
      this.browserPool,
      this.pluginFileService,
      new Liquid({
        strictFilters: true,
        strictVariables: true,
      })
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      loggerWithContext.warn('Worker is already running');
      return;
    }

    loggerWithContext.info('Initializing worker...');

    try {
      // Worker is automatically started when the Worker instance is created
      this.isRunning = true;

      loggerWithContext.info({ queueName: QueueName.SCREENSHOT_JOBS }, 'Worker started and listening for jobs');
    } catch (error) {
      loggerWithContext.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to initialize worker'
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    loggerWithContext.info('Stopping worker...');

    try {
      // Stop the queue
      await this.queue.close();

      // Clean up resources
      await this.jobProcessor.cleanup();

      this.isRunning = false;
      loggerWithContext.info('Worker stopped');
    } catch (error) {
      loggerWithContext.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Error stopping worker'
      );
      throw error;
    }
  }

  private async processJob(job: Job<ScreenshotQueueJob>): Promise<ProcessedScreenshotResult> {
    const jobLogger = loggerWithContext.child({ jobId: job.id });

    try {
      jobLogger.info('Processing job');

      // Process the job - access the screenshot job data from the job's data property
      const result = await this.jobProcessor.processJob(job.id!, job.data);

      jobLogger.info(
        { imageKey: result.imageKey },
        'Job completed successfully'
      );
      return result;
    } catch (error) {
      jobLogger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Error processing job'
      );
      throw error;
    }
  }

  async addJob(id: string, data: ScreenshotQueueJob): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Worker is not running');
    }

    // Add the job to the queue
    const job = await this.queue.addJob(id, data);

    return job;
  }
}
