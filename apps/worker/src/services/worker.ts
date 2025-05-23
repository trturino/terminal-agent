import { Config } from '../config/config';
import { logger } from '../utils/logger';
import { MessageQueue } from './queue';
import { JobProcessor } from './jobProcessor';
import { JobPayload } from '../types/job';
import { promises as fs } from 'fs';

import { ScreenshotService, S3Service } from '@terminal-agent/shared';
import { S3Client } from '@aws-sdk/client-s3';
import { Liquid } from 'liquidjs';
import { BrowserPool } from './browserPool';
import { BrowserPoolConfig } from '../interfaces/IBrowserPool';

const loggerWithContext = logger.child({ module: 'worker' });

export class Worker {
  private isRunning: boolean = false;
  private queue: MessageQueue;
  private jobProcessor: JobProcessor;
  private screenshotService: ScreenshotService;
  private config = Config.getInstance().config.redis;
  private browserPool: BrowserPool;

  constructor() {
    // Initialize S3 client and services
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: true,
    });
    
    const s3Service = new S3Service({
      client: s3Client,
      bucket: process.env.S3_BUCKET || 'terminal-images'
    });
    
    this.screenshotService = new ScreenshotService(s3Service);
    
    // Initialize browser pool with config
    const browserPoolConfig: BrowserPoolConfig = Config.getInstance().config.browserPool;
    this.browserPool = new BrowserPool(browserPoolConfig);
    
    // Initialize the message queue
    this.queue = new MessageQueue(
      'render-queue',
      this.processJob.bind(this)
    );
    
    // Initialize job processor with dependencies
    this.jobProcessor = new JobProcessor(
      this.screenshotService,
      this.browserPool,
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
      
      loggerWithContext.info({ queueName: 'render-queue' }, 'Worker started and listening for jobs');
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

  private async processJob(job: { id: string; data: JobPayload }): Promise<void> {
    const { id, data } = job;
    const jobLogger = loggerWithContext.child({ jobId: id });

    try {
      jobLogger.info('Processing job');
      
      // Process the job
      const result = await this.jobProcessor.processJob(data);
      
      jobLogger.info(
        { imageKey: result.imageKey },
        'Job completed successfully'
      );
    } catch (error) {
      jobLogger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Error processing job'
      );
      throw error;
    } finally {
      // Clean up the temporary zip file if it exists
      if (data.tmpZipPath) {
        try {
          await fs.unlink(data.tmpZipPath);
        } catch (error) {
          jobLogger.warn(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            'Failed to clean up temporary zip file'
          );
        }
      }
    }
  }

  async addJob(data: JobPayload): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Worker is not running');
    }
    
    // Add the job to the queue
    const jobId = await this.queue.addJob({
      id: data.id,
      data
    });
    
    return jobId;
  }
}
