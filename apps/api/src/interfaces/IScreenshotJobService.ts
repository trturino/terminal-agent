import { ScreenshotJob, JobStatus } from '../models/ScreenshotJob.js';
import { ScreenshotJob as SharedScreenshotJob, ProcessedScreenshotResult } from '@terminal-agent/shared';

export interface IScreenshotJobService {
  createJob(jobData: Omit<SharedScreenshotJob, 'id' | 'tmpZipPath'>): Promise<ScreenshotJob>;
  getJobById(id: string): Promise<ScreenshotJob | null>;
  listJobs(limit?: number, offset?: number): Promise<{ jobs: ScreenshotJob[]; total: number }>;
  updateJobStatus(
    id: string,
    status: JobStatus,
    result?: ProcessedScreenshotResult,
    errorMessage?: string
  ): Promise<ScreenshotJob | null>;
}
