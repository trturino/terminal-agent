import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import multipart from '@fastify/multipart';
import { PluginService } from '../../services/PluginService';
import { Plugin } from '../../models/Plugin';
import { IController } from '../IController';

interface CreatePluginRequest {
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled?: boolean;
}

interface UploadPluginFileRequest {
  file: any; // This will be handled by fastify-multipart
}

export class PluginController implements IController {
  private pluginService: PluginService;

  constructor(pluginService: PluginService) {
    this.pluginService = pluginService;
  }

  public registerRoutes(app: FastifyInstance): void {
    // Register routes
    app.post('/internal/plugins', {
      schema: {
        description: 'Create a new plugin',
        body: {
          type: 'object',
          required: ['name', 'version'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string', nullable: true },
            author: { type: 'string', nullable: true },
            enabled: { type: 'boolean', default: false }
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              uuid: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string', nullable: true },
              author: { type: 'string', nullable: true },
              enabled: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }, this.createPlugin.bind(this));

    app.post('/internal/plugins/:id/upload', {
      schema: {
        description: 'Upload or update plugin file',
        consumes: ['multipart/form-data'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            },
          },
        },
      },
    }, this.uploadPluginFile.bind(this));

    app.get('/internal/plugins', {
      schema: {
        description: 'List plugins with pagination',
        querystring: {
          type: 'object',
          properties: {
            skip: { 
              type: 'number',
              description: 'Number of plugins to skip (for pagination)',
              default: 0
            },
            limit: { 
              type: 'number', 
              description: 'Maximum number of plugins to return',
              default: 10,
              maximum: 100
            }
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
                    id: { type: 'number' },
                    uuid: { type: 'string' },
                    name: { type: 'string' },
                    version: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    author: { type: 'string', nullable: true },
                    enabled: { type: 'boolean' },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                  },
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number', description: 'Total number of plugins' },
                  skip: { type: 'number', description: 'Number of plugins skipped' },
                  limit: { type: 'number', description: 'Maximum number of plugins returned' },
                  hasMore: { type: 'boolean', description: 'Whether there are more plugins to fetch' }
                }
              }
            },
          },
        },
      },
    }, this.listPlugins.bind(this));

    app.get('/internal/plugins/:id', {
      schema: {
        description: 'Get a plugin by ID',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              uuid: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string', nullable: true },
              author: { type: 'string', nullable: true },
              enabled: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }, this.getPlugin.bind(this));

    app.patch('/internal/plugins/:id', {
      schema: {
        description: 'Update a plugin',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string', nullable: true },
            author: { type: 'string', nullable: true },
            enabled: { type: 'boolean' },
            file: { isFile: true },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              uuid: { type: 'string' },
              name: { type: 'string' },
              version: { type: 'string' },
              description: { type: 'string', nullable: true },
              author: { type: 'string', nullable: true },
              enabled: { type: 'boolean' },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }, this.updatePlugin.bind(this));

    app.delete('/internal/plugins/:id', {
      schema: {
        description: 'Delete a plugin',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    }, this.deletePlugin.bind(this));

    app.get('/internal/plugins/:id/download-url', {
      schema: {
        description: 'Get a download URL for a plugin',
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            expiresIn: { type: 'string', pattern: '^\\d+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              url: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    }, this.getPluginDownloadUrl.bind(this));
  }

  /**
   * Create a new plugin
   */
  private async createPlugin(
    request: FastifyRequest<{ Body: CreatePluginRequest }>,
    reply: FastifyReply
  ): Promise<Plugin> {
    const { name, version, description, author, enabled = false } = request.body;

    try {
      const plugin = await this.pluginService.createPlugin(
        name,
        version,
        description,
        author,
        enabled
      );

      reply.status(201);
      return plugin;
    } catch (error: any) {
      reply.status(400);
      throw new Error(`Failed to create plugin: ${error.message}`);
    }
  }

  /**
   * Get a plugin by ID
   */
  private async getPlugin(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<Plugin | null> {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      reply.status(400);
      throw new Error('Invalid plugin ID');
    }

    const plugin = await this.pluginService.getPlugin(id);
    if (!plugin) {
      reply.status(404);
      throw new Error('Plugin not found');
    }

    return plugin;
  }

  /**
   * List plugins with pagination
   */
  private async listPlugins(
    request: FastifyRequest<{
      Querystring: { skip?: number; limit?: number }
    }>,
    reply: FastifyReply
  ) {
    const skip = Math.max(0, request.query.skip || 0);
    const limit = Math.min(100, Math.max(1, request.query.limit || 10));

    try {
      const { plugins, total } = await this.pluginService.listPlugins(skip, limit);
      
      return {
        data: plugins,
        pagination: {
          total,
          skip,
          limit,
          hasMore: skip + limit < total
        }
      };
    } catch (error: any) {
      reply.status(500);
      throw new Error(`Failed to list plugins: ${error.message}`);
    }
  }

  /**
   * Update a plugin
   */
  private async updatePlugin(
    request: FastifyRequest<{
      Params: { id: string },
      Body: Partial<CreatePluginRequest> & { enabled?: boolean }
    }>,
    reply: FastifyReply
  ): Promise<Plugin | null> {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      reply.status(400);
      throw new Error('Invalid plugin ID');
    }

    const updates = request.body;

    try {
      return this.pluginService.updatePlugin(id, {
        name: updates.name,
        version: updates.version,
        description: updates.description,
        author: updates.author,
        enabled: updates.enabled
      });
    } catch (error: any) {
      reply.status(400);
      throw new Error(`Failed to update plugin: ${error.message}`);
    }
  }

  /**
   * Delete a plugin
   */
  private async deletePlugin(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<{ success: boolean }> {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      reply.status(400);
      throw new Error('Invalid plugin ID');
    }

    const success = await this.pluginService.deletePlugin(id);
    if (!success) {
      reply.status(404);
      throw new Error('Plugin not found');
    }

    return { success: true };
  }

  /**
   * Get a download URL for a plugin
   */
  /**
   * Upload or update plugin file
   */
  private async uploadPluginFile(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<{ success: boolean; message: string }> {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      reply.status(400);
      throw new Error('Invalid plugin ID');
    }

    if (!request.isMultipart()) {
      reply.status(400);
      throw new Error('Request must be multipart/form-data');
    }

    const file = await request.file();
    if (!file) {
      reply.status(400);
      throw new Error('No file uploaded');
    }

    const fileBuffer = await file.toBuffer();

    try {
      const plugin = await this.pluginService.getPlugin(id);
      if (!plugin) {
        reply.status(404);
        throw new Error('Plugin not found');
      }

      await this.pluginService.uploadPluginFile(id, fileBuffer);
      return { success: true, message: 'Plugin file uploaded successfully' };
    } catch (error: any) {
      reply.status(400);
      throw new Error(`Failed to upload plugin file: ${error.message}`);
    }
  }

  private async getPluginDownloadUrl(
    request: FastifyRequest<{
      Params: { id: string },
      Querystring: { expiresIn?: string }
    }>,
    reply: FastifyReply
  ): Promise<{ url: string }> {
    const id = parseInt(request.params.id, 10);
    if (isNaN(id)) {
      reply.status(400);
      throw new Error('Invalid plugin ID');
    }

    const plugin = await this.pluginService.getPlugin(id);
    if (!plugin) {
      reply.status(404);
      throw new Error('Plugin not found');
    }

    const expiresIn = request.query.expiresIn
      ? parseInt(request.query.expiresIn, 10)
      : 3600; // Default 1 hour

    const url = await this.pluginService.getPluginDownloadUrl(plugin.uuid, expiresIn);
    return { url };
  }
}
