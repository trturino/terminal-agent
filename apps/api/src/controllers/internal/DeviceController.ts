import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { DeviceService } from '../../services/DeviceService.js';
import { Device } from '../../models/Device.js';
import { IController } from '../IController.js';

interface CreateDeviceRequest {
  id: string;
  access_token: string;
  friendly_id?: string;
  firmware_version?: string;
  width?: number;
  height?: number;
  refresh_rate?: number;
  battery_voltage?: number;
  rssi?: number;
  filename?: string;
}

export class DeviceController implements IController {
  private deviceService: DeviceService;

  constructor(deviceService: DeviceService) {
    this.deviceService = deviceService;
  }

  private deviceToPlainObject(device: Device) {
    return {
      device_id: device.device_id,
      id: device.id,
      access_token: device.access_token,
      friendly_id: device.friendly_id,
      firmware_version: device.firmware_version,
      width: device.width,
      height: device.height,
      refresh_rate: device.refresh_rate,
      battery_voltage: device.battery_voltage,
      rssi: device.rssi,
      filename: device.filename,
      created_at: device.created_at,
      updated_at: device.updated_at,
      last_seen_at: device.last_seen_at
    };
  }

  public registerRoutes(app: FastifyInstance): void {
    // Create a new device
    app.post('/internal/devices', {
      schema: {
        description: 'Create a new device',
        tags: ['Device Internal'],
        body: {
          type: 'object',
          required: ['id', 'access_token'],
          properties: {
            id: { type: 'string' },
            access_token: { type: 'string' },
            friendly_id: { type: 'string', nullable: true },
            firmware_version: { type: 'string', nullable: true },
            width: { type: 'number', nullable: true },
            height: { type: 'number', nullable: true },
            refresh_rate: { type: 'number', nullable: true },
            battery_voltage: { type: 'number', nullable: true },
            rssi: { type: 'number', nullable: true },
            filename: { type: 'string', default: 'empty_state' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              device_id: { type: 'number' },
              id: { type: 'string' },
              access_token: { type: 'string' },
              friendly_id: { type: 'string', nullable: true },
              firmware_version: { type: 'string', nullable: true },
              width: { type: 'number', nullable: true },
              height: { type: 'number', nullable: true },
              refresh_rate: { type: 'number', nullable: true },
              battery_voltage: { type: 'number', nullable: true },
              rssi: { type: 'number', nullable: true },
              filename: { type: 'string', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              last_seen_at: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      }
    }, this.createDevice.bind(this));

    // List devices with pagination
    app.get('/internal/devices', {
      schema: {
        description: 'List devices with pagination',
        tags: ['Device Internal'],
        querystring: {
          type: 'object',
          properties: {
            skip: {
              type: 'number',
              description: 'Number of devices to skip (for pagination)',
              default: 0
            },
            limit: {
              type: 'number',
              description: 'Maximum number of devices to return',
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
                    device_id: { type: 'number' },
                    id: { type: 'string' },
                    access_token: { type: 'string' },
                    friendly_id: { type: 'string', nullable: true },
                    firmware_version: { type: 'string', nullable: true },
                    width: { type: 'number', nullable: true },
                    height: { type: 'number', nullable: true },
                    refresh_rate: { type: 'number', nullable: true },
                    battery_voltage: { type: 'number', nullable: true },
                    rssi: { type: 'number', nullable: true },
                    filename: { type: 'string', nullable: true },
                    created_at: { type: 'string', format: 'date-time' },
                    updated_at: { type: 'string', format: 'date-time' },
                    last_seen_at: { type: 'string', format: 'date-time', nullable: true }
                  }
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  total: { type: 'number', description: 'Total number of devices' },
                  skip: { type: 'number', description: 'Number of devices skipped' },
                  limit: { type: 'number', description: 'Maximum number of devices returned' },
                  hasMore: { type: 'boolean', description: 'Whether there are more devices to fetch' }
                }
              }
            }
          }
        }
      }
    }, this.listDevices.bind(this));

    // Get a device by ID
    app.get('/internal/devices/:id', {
      schema: {
        description: 'Get a device by ID',
        tags: ['Device Internal'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              device_id: { type: 'number' },
              id: { type: 'string' },
              access_token: { type: 'string' },
              friendly_id: { type: 'string', nullable: true },
              firmware_version: { type: 'string', nullable: true },
              width: { type: 'number', nullable: true },
              height: { type: 'number', nullable: true },
              refresh_rate: { type: 'number', nullable: true },
              battery_voltage: { type: 'number', nullable: true },
              rssi: { type: 'number', nullable: true },
              filename: { type: 'string', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              last_seen_at: { type: 'string', format: 'date-time', nullable: true }
            }
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }, this.getDevice.bind(this));

    // Update a device
    app.patch('/internal/devices/:id', {
      schema: {
        description: 'Update a device',
        tags: ['Device Internal'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        body: {
          type: 'object',
          properties: {
            friendly_id: { type: 'string', nullable: true },
            firmware_version: { type: 'string', nullable: true },
            width: { type: 'number', nullable: true },
            height: { type: 'number', nullable: true },
            refresh_rate: { type: 'number', nullable: true },
            battery_voltage: { type: 'number', nullable: true },
            rssi: { type: 'number', nullable: true },
            filename: { type: 'string', nullable: true }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              device_id: { type: 'number' },
              id: { type: 'string' },
              access_token: { type: 'string' },
              friendly_id: { type: 'string', nullable: true },
              firmware_version: { type: 'string', nullable: true },
              width: { type: 'number', nullable: true },
              height: { type: 'number', nullable: true },
              refresh_rate: { type: 'number', nullable: true },
              battery_voltage: { type: 'number', nullable: true },
              rssi: { type: 'number', nullable: true },
              filename: { type: 'string', nullable: true },
              created_at: { type: 'string', format: 'date-time' },
              updated_at: { type: 'string', format: 'date-time' },
              last_seen_at: { type: 'string', format: 'date-time', nullable: true }
            }
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }, this.updateDevice.bind(this));

    // Delete a device
    app.delete('/internal/devices/:id', {
      schema: {
        description: 'Delete a device',
        tags: ['Device Internal'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' }
          }
        },
        response: {
          204: {
            type: 'object',
            properties: {
              success: { type: 'boolean' }
            }
          },
          404: {
            type: 'object',
            properties: {
              statusCode: { type: 'number' },
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    }, this.deleteDevice.bind(this));
  }

  private async createDevice(
    request: FastifyRequest<{ Body: CreateDeviceRequest }>,
    reply: FastifyReply
  ) {
    const deviceData = request.body;
    const device = await this.deviceService.registerDevice(
      deviceData.id,
      deviceData.access_token,
      {
        friendlyId: deviceData.friendly_id,
        firmwareVersion: deviceData.firmware_version,
        width: deviceData.width,
        height: deviceData.height,
        refreshRate: deviceData.refresh_rate,
        batteryVoltage: deviceData.battery_voltage,
        rssi: deviceData.rssi,
        filename: deviceData.filename || 'empty_state'
      }
    );

    reply.status(201);
    return this.deviceToPlainObject(device);
  }

  private async listDevices(
    request: FastifyRequest<{ Querystring: { skip?: string; limit?: string } }>,
    reply: FastifyReply
  ) {
    const skip = request.query.skip ? parseInt(request.query.skip, 10) : 0;
    const limit = request.query.limit ? Math.min(parseInt(request.query.limit, 10), 100) : 10;

    const { data, total } = await this.deviceService.listDevices(skip, limit);

    return {
      data: data.map(device => this.deviceToPlainObject(device)),
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total
      }
    };
  }

  private async getDevice(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const device = await this.deviceService.getDevice(id);

    if (!device) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Device with id ${id} not found`
      });
    }

    return device.toJSON();
  }

  private async updateDevice(
    request: FastifyRequest<{
      Params: { id: string };
      Body: Partial<Omit<CreateDeviceRequest, 'id' | 'access_token'>>
    }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const updateData = request.body;

    // Map the update data to match the service method signature
    const updatePayload: any = {};
    if (updateData.friendly_id !== undefined) updatePayload.friendly_id = updateData.friendly_id;
    if (updateData.firmware_version !== undefined) updatePayload.firmware_version = updateData.firmware_version;
    if (updateData.width !== undefined) updatePayload.width = updateData.width;
    if (updateData.height !== undefined) updatePayload.height = updateData.height;
    if (updateData.refresh_rate !== undefined) updatePayload.refresh_rate = updateData.refresh_rate;
    if (updateData.battery_voltage !== undefined) updatePayload.battery_voltage = updateData.battery_voltage;
    if (updateData.rssi !== undefined) updatePayload.rssi = updateData.rssi;
    if (updateData.filename !== undefined) updatePayload.filename = updateData.filename;

    const updatedDevice = await this.deviceService.updateDevice(id, updatePayload);

    if (!updatedDevice) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Device with id ${id} not found`
      });
    }

    return this.deviceToPlainObject(updatedDevice);
  }

  private async deleteDevice(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { id } = request.params;
    const deleted = await this.deviceService.deleteDevice(id);

    if (!deleted) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Device with id ${id} not found`
      });
    }

    reply.status(204).send({ success: true });
  }
}
