import { Job } from 'bullmq';

export interface IQueueService<T, R> {
  addJob(
    id: string,
    data: T,
  ): Promise<string>;

  getJob(id: string): Promise<Job<T, R, string> | null>;

  close(): Promise<void>;

  // Optional methods that might be used by the service
  getJobCounts?(): Promise<{ active: number; completed: number; failed: number; delayed: number; waiting: number; }>;

  clean?(grace?: number, limit?: number): Promise<void>;
}
