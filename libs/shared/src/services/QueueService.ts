import { Queue, Worker, QueueEvents, Processor, Job } from 'bullmq';
import { QueueName, QueueJobData, QueueJobResult, QueueConfig } from '../types/queue';
import logger from './logger';
import { IQueueService } from '../interfaces/IQueueService';

export class QueueService implements IQueueService {
  protected queue: Queue;
  protected worker: Worker | null = null;
  protected queueEvents: QueueEvents;
  protected logger = logger.child({ module: 'QueueService' });

  constructor(
    protected queueName: string,
    protected config: QueueConfig,
    protected processor?: Processor<QueueJobData>
  ) {
    const connection = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      tls: config.tls,
    };

    this.queue = new Queue<QueueJobData, QueueJobResult>(queueName, {
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
      this.worker = new Worker<QueueJobData, QueueJobResult>(
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

    this.worker.on('completed', (job: Job<QueueJobData, QueueJobResult>, result: QueueJobResult) => {
      this.logger.info({ jobId: job.id, result }, 'Job completed successfully');
    });

    this.worker.on('failed', (job: Job<QueueJobData, QueueJobResult> | undefined, error: Error) => {
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
    data: Omit<QueueJobData, 'jobId'>,
    options: { jobId?: string } = {}
  ): Promise<{ id: string }> {
    const jobId = options.jobId || `job-${Date.now()}`;
    const job = await this.queue.add(
      'process',
      { ...data, jobId },
      { jobId }
    );
    this.logger.info({ jobId: job.id }, 'Job added to queue');
    return { id: job.id! };
  }

  async getJob(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;
    
    const state = await job.getState();
    const result = await job.getReturnValue();
    
    return {
      id: job.id!,
      state,
      result,
      getState: job.getState.bind(job),
      getReturnValue: job.getReturnValue.bind(job)
    };
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
