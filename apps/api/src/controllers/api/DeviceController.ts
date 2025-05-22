import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IDeviceService } from '../../interfaces/IDeviceService';
import { IFileService } from '@terminal-agent/shared';
import { v4 as uuidv4 } from 'uuid';
import { IController } from '../IController';

interface DisplayResponse {
  status: number;
  image_url: string | null;
  filename: string | null;
  update_firmware: boolean;
  firmware_url: string | null;
  refresh_rate: string;
  reset_firmware: boolean;
}

interface DisplayRequestHeaders {
  ID: string;
  'Access-Token': string;
  'FW-Version': string | null;
  'Refresh-Rate': string | null;
  'Battery-Voltage': string | null;
  'RSSI': string | null;
  'Width': string | null;
  'Height': string | null;
}

export class DeviceController implements IController {
  private deviceService: IDeviceService;
  private fileService: IFileService;

  constructor(deviceService: IDeviceService, fileService: IFileService) {
    this.deviceService = deviceService;
    this.fileService = fileService;
  }

  public registerRoutes(app: FastifyInstance): void {
    // Setup endpoint for new devices
    app.get('/api/setup', {
      schema: {
        tags: ['Device'],
        summary: 'Register a new device',
        description: 'Registers a new device and returns an API key',
        headers: {
          type: 'object',
          required: ['ID'],
          properties: {
            'ID': {
              type: 'string',
              description: 'Device MAC address',
              pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'number', example: 200 },
              api_key: { type: 'string', example: '2r--SahjsAKCFksVcped2Q' },
              friendly_id: { type: 'string', example: '917F0B' },
              image_url: { type: 'string', example: 'https://usetrmnl.com/images/setup/setup-logo.bmp' },
              filename: { type: 'string', example: 'empty_state' }
            }
          },
          400: {
            type: 'object',
            properties: {
              status: { type: 'number', example: 400 },
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'ID header is required' }
            }
          },
          500: {
            type: 'object',
            properties: {
              status: { type: 'number', example: 500 },
              error: { type: 'string', example: 'Internal Server Error' },
              message: { type: 'string', example: 'Failed to register device' }
            }
          }
        }
      }
    }, this.handleSetupRequest.bind(this));

    app.get('/api/display', {
      schema: {
        tags: ['Device'],
        summary: 'Get display data for a device',
        description: 'Retrieves the latest display data including image URL and firmware update information for a specific device',
        security: [{ apiKey: [] }],
        headers: {
          type: 'object',
          required: ['ID', 'Access-Token'],
          properties: {
            'ID': {
              type: 'string',
              description: 'Unique device identifier',
              pattern: '^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$'
            },
            'Access-Token': { type: 'string', description: 'Authentication token' },
            'FW-Version': { type: 'string', description: 'Device firmware version' },
            'Refresh-Rate': { type: 'string', description: 'Current device refresh rate' },
            'Battery-Voltage': { type: 'string', description: 'Current battery voltage' },
            'RSSI': { type: 'string', description: 'Signal strength indicator' },
            'Width': { type: 'string', description: 'Display width in pixels' },
            'Height': { type: 'string', description: 'Display height in pixels' },
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'number', example: 200 },
              image_url: { type: ['string', 'null'], example: 'https://example.com/image.png' },
              filename: { type: ['string', 'null'], example: 'image.png' },
              update_firmware: { type: 'boolean', example: false },
              firmware_url: { type: ['string', 'null'], example: null },
              refresh_rate: { type: 'string', example: '300' },
              reset_firmware: { type: 'boolean', example: false }
            }
          },
          400: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 400 },
              error: { type: 'string', example: 'Bad Request' },
              message: { type: 'string', example: 'ID and Access-Token headers required' }
            }
          },
          500: {
            type: 'object',
            properties: {
              statusCode: { type: 'number', example: 500 },
              error: { type: 'string', example: 'Internal Server Error' },
              message: { type: 'string', example: 'An internal server error occurred' }
            }
          }
        }
      }
    }, this.handleDisplayRequest.bind(this));
  }

  private async handleSetupRequest(
    req: FastifyRequest<{ Headers: { id: string } }>,
    reply: FastifyReply
  ) {
    const macAddress = req.headers.id;

    if (!macAddress) {
      return reply.status(400).send({
        status: 400,
        error: 'Bad Request',
        message: 'ID header is required'
      });
    }

    try {
      // Generate a new API key
      const apiKey = uuidv4().replace(/-/g, '');

      // Register the device with all initial values
      const device = await this.deviceService.registerDevice(
        macAddress,
        apiKey,
        {
          // Using default values for all other fields
          firmwareVersion: '',
          filename: 'empty_state'
        }
      );

      return {
        status: 200,
        api_key: device.access_token,
        friendly_id: device.friendly_id,
        image_url: 'https://usetrmnl.com/images/setup/setup-logo.bmp',
        filename: device.filename || 'empty_state'
      };
    } catch (error) {
      console.error('Error in setup:', error);
      return reply.status(500).send({
        status: 500,
        error: 'Internal Server Error',
        message: 'Failed to register device'
      });
    }
  }

  private async handleDisplayRequest(
    req: FastifyRequest<{ Headers: DisplayRequestHeaders }>,
    reply: FastifyReply
  ): Promise<DisplayResponse> {
    const id = req.headers['id'] as string;
    const accessToken = req.headers['access-token'] as string;

    if (!id || !accessToken) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'ID and Access-Token headers required'
      });
    }

    try {
      // Extract and validate device properties from headers
      const fwVersion = (req.headers['fw_version'] as string) ?? '';

      // Parse numeric values with proper validation
      const parseNumber = (value: string | undefined, defaultValue: number): number => {
        if (value === undefined) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
      };

      const refreshRate = parseInt((req.headers['refresh_rate'] as string) ?? '0', 10);
      const batteryVoltage = parseNumber(req.headers['battery_voltage'] as string, 0);
      const rssi = parseNumber(req.headers['rssi'] as string, 0);
      const width = parseNumber(req.headers['width'] as string, 0);
      const height = parseNumber(req.headers['height'] as string, 0);

      // Create or update device with all properties using registerDevice
      const device = await this.deviceService.registerDevice(
        id,
        accessToken,
        {
          firmwareVersion: fwVersion,
          width,
          height,
          refreshRate,
          batteryVoltage,
          rssi,
          filename: 'default.bmp' // Default filename for display requests
        }
      );

      // Handle file URL generation
      let imageUrl = '';
      let filename = device.filename || 'default.bmp';

      try {
        // Get presigned URL for the file
        if (device.filename) {
          imageUrl = await this.fileService.getPresignedUrl(id, device.filename);
        } else {
          // Fallback to default image if no file is set for the device
          filename = 'default.bmp';
          imageUrl = await this.fileService.getPresignedUrl('default', filename);
        }
      } catch (error) {
        console.error('Error generating presigned URL:', error);
        return reply.status(500).send({ error: 'Failed to generate file URL' });
      }

      return reply.send({
        filename,
        image_url: imageUrl,
        image_url_timeout: 0,
        refresh_rate: refreshRate,
        reset_firmware: false,
        special_function: 'sleep',
        update_firmware: false,
      });
    } catch (error) {
      console.error('Error handling display request:', error);
      return reply.status(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'An error occurred while processing your request'
      });
    }
  }
}
