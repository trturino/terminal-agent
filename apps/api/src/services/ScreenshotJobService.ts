import { db } from '../config/Database.js';
import { ScreenshotJob, JobStatus } from '../models/ScreenshotJob.js';
import { IScreenshotJobService } from '../interfaces/IScreenshotJobService.js';
import { v4 as uuidv4 } from 'uuid';
import { ScreenshotJob as SharedScreenshotJob, ProcessedScreenshotResult, QueueJobData } from '@terminal-agent/shared';
import { IQueueService } from '@terminal-agent/shared';

export class ScreenshotJobService implements IScreenshotJobService {
  private tableName = 'screenshot_jobs';
  
  constructor(private queueService: IQueueService) {}

  async createJob(jobData: Omit<SharedScreenshotJob, 'id' | 'tmpZipPath'>): Promise<ScreenshotJob> {
    const id = uuidv4();
    const now = new Date();
    
    const query = `
      INSERT INTO ${this.tableName} (
        id, 
        device_profile, 
        color_scheme, 
        status, 
        created_at, 
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      id,
      JSON.stringify(jobData.deviceProfile),
      jobData.colorScheme ? JSON.stringify(jobData.colorScheme) : null,
      'pending',
      now,
      now
    ];

    const result = await db.getPool().query(query, values);
    const job = new ScreenshotJob(this.mapDbRowToJob(result.rows[0]));
    
    // Add job to the queue for processing
    const jobDataToQueue: Omit<QueueJobData, 'jobId'> = {
      payload: {
        deviceProfile: jobData.deviceProfile,
        colorScheme: jobData.colorScheme,
      },
    };
    
    await this.queueService.addJob(jobDataToQueue, { jobId: job.id });
    
    return job;
  }

  async getJobById(id: string): Promise<ScreenshotJob | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await db.getPool().query(query, [id]);
    
    if (result.rows.length === 0) return null;
    return new ScreenshotJob(this.mapDbRowToJob(result.rows[0]));
  }

  async listJobs(limit: number = 10, offset: number = 0): Promise<{ jobs: ScreenshotJob[]; total: number }> {
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    const countResult = await db.getPool().query(countQuery);
    const total = parseInt(countResult.rows[0].count, 10);

    const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await db.getPool().query(query, [limit, offset]);
    
    return {
      jobs: result.rows.map(row => new ScreenshotJob(this.mapDbRowToJob(row))),
      total
    };
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    result?: ProcessedScreenshotResult,
    errorMessage?: string
  ): Promise<ScreenshotJob | null> {
    const now = new Date();
    const updates: string[] = [
      'status = $1',
      'updated_at = $2'
    ];
    const values: any[] = [status, now];

    if (status === 'completed' || status === 'failed') {
      updates.push('completed_at = $3');
      values.push(now);
    }

    if (result) {
      updates.push('result = $' + (values.length + 1));
      values.push(JSON.stringify(result));
    }

    if (errorMessage) {
      updates.push('error_message = $' + (values.length + 1));
      values.push(errorMessage);
    }

    const query = `
      UPDATE ${this.tableName}
      SET ${updates.join(', ')}
      WHERE id = $${values.length + 1}
      RETURNING *
    `;
    
    values.push(id);
    
    const resultQuery = await db.getPool().query(query, values);
    
    if (resultQuery.rows.length === 0) return null;
    return new ScreenshotJob(this.mapDbRowToJob(resultQuery.rows[0]));
  }

  private mapDbRowToJob(row: any): any {
    return {
      job_id: row.job_id,
      id: row.id,
      device_profile: typeof row.device_profile === 'string' 
        ? JSON.parse(row.device_profile) 
        : row.device_profile,
      color_scheme: row.color_scheme 
        ? (typeof row.color_scheme === 'string' 
          ? JSON.parse(row.color_scheme) 
          : row.color_scheme)
        : undefined,
      status: row.status,
      error_message: row.error_message,
      result: row.result 
        ? (typeof row.result === 'string' 
          ? JSON.parse(row.result) 
          : row.result)
        : undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at
    };
  }
}
