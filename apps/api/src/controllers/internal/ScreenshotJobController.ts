import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IScreenshotJobService } from '../../interfaces/IScreenshotJobService';
import { ScreenshotJob, JobStatus } from '../../models/ScreenshotJob';
import { IController } from '../IController';
import { DeviceProfile, ColorScheme, ProcessedScreenshotResult } from '@terminal-agent/shared';
import { IQueueService } from '@terminal-agent/shared';

interface CreateScreenshotJobRequest {
  deviceProfile: DeviceProfile;
  colorScheme?: ColorScheme;
}

interface ListJobsQuery {
  limit?: number;
  offset?: number;
}

export class ScreenshotJobController implements IController {
  constructor(
    private screenshotJobService: IScreenshotJobService,
    private queueService: IQueueService
  ) {}

  private toResponse(job: ScreenshotJob) {
    return {
      job_id: job.job_id,
      id: job.id,
      device_profile: job.device_profile,
      color_scheme: job.color_scheme,
      status: job.status,
      error_message: job.error_message,
      result: job.result,
      created_at: job.created_at,
      updated_at: job.updated_at,
      completed_at: job.completed_at,
    };
  }

  async createJob(
    request: FastifyRequest<{ Body: CreateScreenshotJobRequest }>,
    reply: FastifyReply
  ) {
    try {
      const { deviceProfile, colorScheme } = request.body;
      
      // Create the job in the database
      const job = await this.screenshotJobService.createJob({
        deviceProfile,
        colorScheme,
      });
      
      // The job is automatically added to the queue by the service
      
      return reply.code(201).send(this.toResponse(job));
    } catch (error) {
      request.log.error({ error }, 'Failed to create screenshot job');
      return reply.code(500).send({ error: 'Failed to create screenshot job' });
    }
  }

  async getJob(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { id } = request.params;
      const job = await this.screenshotJobService.getJobById(id);
      
      if (!job) {
        return reply.code(404).send({ error: 'Job not found' });
      }
      
      return reply.code(200).send(this.toResponse(job));
    } catch (error) {
      request.log.error({ error, jobId: request.params.id }, 'Failed to get job');
      return reply.code(500).send({ error: 'Failed to get screenshot job' });
    }
  }

  async listJobs(
    request: FastifyRequest<{ Querystring: ListJobsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const { limit = 10, offset = 0 } = request.query;
      const { jobs, total } = await this.screenshotJobService.listJobs(limit, offset);
      
      return {
        data: jobs.map(job => this.toResponse(job)),
        meta: {
          total,
          limit: Number(limit),
          offset: Number(offset)
        }
      };
    } catch (error) {
      request.log.error(error, 'Failed to list screenshot jobs');
      return reply.code(500).send({ error: 'Failed to list screenshot jobs' });
    }
  }

  // TODO: Add webhook handler for worker to update job status

  registerRoutes(server: FastifyInstance): void {
    // Create a new screenshot job
    server.post(
      '/internal/jobs/screenshot',
      {
        schema: {
          tags: ['Screenshot Job Internal'],
          body: {
            type: 'object',
            required: ['deviceProfile'],
            properties: {
              deviceProfile: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                  format: { type: 'string', enum: ['bmp', 'png'] }
                },
                required: ['width', 'height', 'format']
              },
              colorScheme: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['rgb565', 'rgba8888', 'indexed8', 'grayscale'] },
                  palette: { 
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['type']
              }
            }
          },
          response: {
            201: {
              type: 'object',
              properties: {
                job_id: { type: 'number' },
                id: { type: 'string' },
                device_profile: {
                  type: 'object',
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                    format: { type: 'string' }
                  }
                },
                color_scheme: { type: ['object', 'null'] },
                status: { type: 'string' },
                error_message: { type: ['string', 'null'] },
                result: { type: ['object', 'null'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                completed_at: { type: ['string', 'null'], format: 'date-time' }
              }
            },
            500: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      },
      this.createJob.bind(this)
    );

    // Get a screenshot job by ID
    server.get(
      '/internal/jobs/screenshot/:id',
      {
        schema: {
          tags: ['Screenshot Job Internal'],
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            },
            required: ['id']
          },
          response: {
            200: {
              type: 'object',
              properties: {
                job_id: { type: 'number' },
                id: { type: 'string' },
                device_profile: {
                  type: 'object',
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                    format: { type: 'string' }
                  }
                },
                color_scheme: { type: ['object', 'null'] },
                status: { type: 'string' },
                error_message: { type: ['string', 'null'] },
                result: { type: ['object', 'null'] },
                created_at: { type: 'string', format: 'date-time' },
                updated_at: { type: 'string', format: 'date-time' },
                completed_at: { type: ['string', 'null'], format: 'date-time' }
              }
            },
            404: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            },
            500: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      },
      this.getJob.bind(this)
    );

    // List all screenshot jobs with pagination
    server.get(
      '/internal/jobs/screenshot',
      {
        schema: {
          tags: ['Screenshot Job Internal'],
          querystring: {
            type: 'object',
            properties: {
              limit: { type: 'number', default: 10 },
              offset: { type: 'number', default: 0 }
            }
          },
          response: {
            200: {
              type: 'object',
              properties: {
                data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      job_id: { type: 'number' },
                      id: { type: 'string' },
                      device_profile: {
                        type: 'object',
                        properties: {
                          width: { type: 'number' },
                          height: { type: 'number' },
                          format: { type: 'string' }
                        }
                      },
                      color_scheme: { type: ['object', 'null'] },
                      status: { type: 'string' },
                      error_message: { type: ['string', 'null'] },
                      result: { type: ['object', 'null'] },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_at: { type: 'string', format: 'date-time' },
                      completed_at: { type: ['string', 'null'], format: 'date-time' }
                    }
                  }
                },
                meta: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    limit: { type: 'number' },
                    offset: { type: 'number' }
                  },
                  required: ['total', 'limit', 'offset']
                }
              }
            },
            500: {
              type: 'object',
              properties: {
                error: { type: 'string' }
              }
            }
          }
        }
      },
      this.listJobs.bind(this)
    );
  }
}
