import { ScreenshotQueueJob, ProcessedScreenshotResult } from "@terminal-agent/shared";

export interface IJobProcessor {
  processJob(payload: ScreenshotQueueJob): Promise<ProcessedScreenshotResult>;
  cleanup(): Promise<void>;
}
