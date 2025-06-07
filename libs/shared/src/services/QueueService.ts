import { Queue, Worker, QueueEvents, Processor, Job } from 'bullmq';
import { QueueNameType, QueueConfig } from '../types/queue.js';
import logger from './logger.js';
import { IQueueService } from '../interfaces/IQueueService.js';

export class QueueService<T, R> implements IQueueService<T, R> {
  protected queue: Queue<Job<T, R>, R>;
  protected worker: Worker<T, R> | null = null;
  protected queueEvents: QueueEvents;
  protected logger = logger.child({ module: 'QueueService' });

  constructor(
    protected queueName: QueueNameType,
    protected config: QueueConfig,
    protected processor?: Processor<T, R>
  ) {
    const connection = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      tls: config.tls,
    };

    this.queue = new Queue<Job<T, R>, R>(queueName, {
      connection,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.queueEvents = new QueueEvents(queueName, { connection });

    if (processor) {
      this.worker = new Worker<T, R>(
        queueName,
        processor,
        {
          connection,
          concurrency: 5,
        }
      );

      this.setupWorkerHandlers();
    }
  }

  private setupWorkerHandlers() {
    if (!this.worker) return;

    this.worker.on('completed', (job: Job<T, R>, result: R) => {
      this.logger.info({ jobId: job.id, result }, 'Job completed successfully');
    });

    this.worker.on('failed', (job: Job<T, R> | undefined, error: Error) => {
      this.logger.error(
        { jobId: job?.id, error: error.message, stack: error.stack },
        'Job failed'
      );
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error({ error: error.message, stack: error.stack }, 'Worker error');
    });
  }

  async addJob(
    id: string,
    data: T,
  ): Promise<string> {
    const job = await this.queue.add(
      id,
      data,
      { jobId: id }
    );
    this.logger.info({ jobId: job.id }, 'Job added to queue');
    return job.id!;
  }

  async getJob(id: string): Promise<Job<T, R> | null> {
    const job = await this.queue.getJob(id);
    if (!job) return null;
    
    return job;
  }

  async close() {
    await this.queue.close();
    if (this.worker) {
      await this.worker.close();
    }
    await this.queueEvents.close();
  }

  async getJobCounts() {
    const counts = await this.queue.getJobCounts();
    return {
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      waiting: counts.waiting || 0
    };
  }

  async clean(grace = 1000 * 60 * 30, limit = 1000) {
    await this.queue.clean(grace, limit, 'completed');
    return;
  }
}
