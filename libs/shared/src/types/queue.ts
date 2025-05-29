export const QueueName = {
  SCREENSHOT_JOBS: 'screenshot-jobs',
} as const;

export type QueueNameType = typeof QueueName[keyof typeof QueueName];

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
