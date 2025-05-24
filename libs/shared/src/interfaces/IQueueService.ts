import { QueueJobData, QueueJobResult } from '../types/queue';

export interface IQueueService {
  addJob(
    data: Omit<QueueJobData, 'jobId'>, 
    options?: { jobId?: string }
  ): Promise<{ id: string }>;
  
  getJob(jobId: string): Promise<{ 
    id: string; 
    state: string; 
    result?: QueueJobResult;
    getState(): Promise<string>;
    getReturnValue(): Promise<QueueJobResult | undefined>;
  } | null>;
  
  close(): Promise<void>;
  
  // Optional methods that might be used by the service
  getJobCounts?(): Promise<{
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    waiting: number;
  }>;
  
  clean?(grace?: number, limit?: number): Promise<void>;
}
