import { ScreenshotJob } from './screenshot-job';

export const QueueName = {
  SCREENSHOT_JOBS: 'screenshot-jobs',
} as const;

export type QueueNameType = typeof QueueName[keyof typeof QueueName];

export interface QueueJobData {
  jobId: string;
  payload: Omit<ScreenshotJob, 'id' | 'tmpZipPath'>;
}

export interface QueueJobResult {
  success: boolean;
  result?: {
    imageKey: string;
    metadata: {
      width: number;
      height: number;
      format: string;
      size: number;
    };
  };
  error?: string;
}

export interface QueueConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  prefix?: string;
  tls?: {
    rejectUnauthorized: boolean;
    requestCert: boolean;
    agent: boolean;
  };
}
