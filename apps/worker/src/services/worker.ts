import { Config } from '../config/config';
import { logger } from '../utils/logger';
import { MessageQueue } from './queue';

const loggerWithContext = logger.child({ module: 'worker' });

export class Worker {
  private isRunning: boolean = false;
  private queue: MessageQueue;
  private config = Config.getInstance().config.redis;

  constructor() {
    // Initialize the message queue
    this.queue = new MessageQueue(
      this.config.queueName,
      this.processJob.bind(this)
    );
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      loggerWithContext.warn('Worker is already running');
      return;
    }

    this.isRunning = true;
    loggerWithContext.info({ queueName: this.config.queueName }, 'Starting worker');
    loggerWithContext.info('Worker started and listening for jobs');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      loggerWithContext.warn('Worker is not running');
      return;
    }

    loggerWithContext.info('Stopping worker...');
    this.isRunning = false;

    // Close the queue and its connections
    await this.queue.close();

    loggerWithContext.info('Worker stopped');
  }

  /**
   * Add a new job to the queue
   */
  async addJob(data: any, options = {}) {
    return this.queue.addJob(data, options);
  }

  /**
   * Process a job from the queue
   */
  private async processJob(job: any): Promise<void> {
    const { id, data } = job;
    loggerWithContext.info({ jobId: job.id, data: job.data }, 'Processing job');
    
    try {
      // Convert data to message format if needed
      const message = this.prepareMessage(data);
      
      // Process the message
      await this.processMessage(id, message);
      
      loggerWithContext.info({ jobId: job.id }, 'Job completed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      loggerWithContext.error(
        { 
          jobId: job.id,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        },
        'Error processing job'
      );
      throw error; // Let BullMQ handle retries
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(id: string, message: any): Promise<void> {
    // Process the message
    loggerWithContext.info({ id, message }, 'Processing message');
    
    // Add your message processing logic here
    // For example:
    // await someService.process(message);
    
    // Simulate some work
    await new Promise(resolve => setTimeout(resolve, 100));
    
    loggerWithContext.info({ id }, 'Message processed successfully');
  }

  /**
   * Convert incoming data to a consistent message format
   */
  private prepareMessage(data: any): any {
    // If data is already in the correct format, return it
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data;
    }
    
    // If data is an array, convert it to an object
    if (Array.isArray(data)) {
      const message: Record<string, string> = {};
      for (let i = 0; i < data.length; i += 2) {
        message[data[i]] = data[i + 1];
      }
      return message;
    }
    
    // If we can't convert it, return as is
    return data;
  }
}
