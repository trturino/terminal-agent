import { JobPayload, ProcessedJobResult } from '../types/job';

export interface IJobProcessor {
  processJob(payload: JobPayload): Promise<ProcessedJobResult>;
  cleanup(): Promise<void>;
}
