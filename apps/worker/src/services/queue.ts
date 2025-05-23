import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { Config } from '../config/config';
import { logger } from '../utils/logger';

const loggerWithContext = logger.child({ module: 'queue' });

export class MessageQueue {
  private queue: Queue;

  private worker: Worker;
  private redisClient: Redis;
  private config = Config.getInstance().config.redis;

  constructor(
    private queueName: string,
    private processFn: (job: Job) => Promise<void>
  ) {
    this.redisClient = new Redis({
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(queueName, {
      connection: this.redisClient,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000, // Keep failed jobs for debugging
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.worker = new Worker(
      queueName,
      async (job: Job) => {
        loggerWithContext.info({ jobId: job.id }, 'Processing job');
        await this.processFn(job);
      },
      {
        connection: this.redisClient,
        concurrency: 5, // Process up to 5 jobs in parallel
      }
    );

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      loggerWithContext.info({ jobId: job.id }, 'Job completed successfully');
    });

    this.worker.on('failed', (job, error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerWithContext.error(
        { 
          jobId: job?.id, 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Job failed'
      );
    });

    this.worker.on('error', (error) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerWithContext.error(
        { 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Worker error'
      );
    });
  }

  async addJob(data: any, options = {}) {
    const job = await this.queue.add('process', data, options);
    loggerWithContext.info({ jobId: job.id, queue: this.queueName }, 'Job added to queue');
    return job;
  }

  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.redisClient.quit();
  }

  getQueue() {
    return this.queue;
  }

  getWorker() {
    return this.worker;
  }
}

export interface ProcessMessageFn {
  (data: any): Promise<void>;
}
