import { JsonSerializable, Timestamped } from './BaseModel.js';
import { DeviceProfile, ColorScheme, ProcessedScreenshotResult } from '@terminal-agent/shared';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ScreenshotJobData extends Timestamped {
  job_id?: number;
  id: string;
  device_profile: DeviceProfile;
  color_scheme?: ColorScheme;
  status: JobStatus;
  error_message?: string;
  result?: ProcessedScreenshotResult;
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;
}

export class ScreenshotJob implements ScreenshotJobData {
  job_id?: number;
  id: string;
  device_profile: DeviceProfile;
  color_scheme?: ColorScheme;
  status: JobStatus;
  error_message?: string;
  result?: ProcessedScreenshotResult;
  created_at?: Date;
  updated_at?: Date;
  completed_at?: Date;

  constructor(data: ScreenshotJobData) {
    this.job_id = data.job_id;
    this.id = data.id;
    this.device_profile = data.device_profile;
    this.color_scheme = data.color_scheme;
    this.status = data.status;
    this.error_message = data.error_message;
    this.result = data.result;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.completed_at = data.completed_at;
  }

  toJSON() {
    return {
      job_id: this.job_id,
      id: this.id,
      device_profile: this.device_profile,
      color_scheme: this.color_scheme,
      status: this.status,
      error_message: this.error_message,
      result: this.result,
      created_at: this.created_at,
      updated_at: this.updated_at,
      completed_at: this.completed_at,
    };
  }
}
