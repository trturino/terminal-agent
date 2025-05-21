import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { IDeviceService } from '../interfaces/IDeviceService';
import { IFileService } from '../interfaces/IFileService';

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
  id: string;
  'access-token': string;
  'fw_version'?: string;
  'refresh_rate'?: string;
  'battery_voltage'?: string;
  'rssi'?: string;
  'width'?: string;
  'height'?: string;
  'host'?: string;
  'user_agent'?: string;
  'x-forwarded-for'?: string;
}

export class DeviceController {
  private deviceService: IDeviceService;
  private fileService: IFileService;

  constructor(deviceService: IDeviceService, fileService: IFileService) {
    this.deviceService = deviceService;
    this.fileService = fileService;
  }

  public registerRoutes(app: FastifyInstance): void {
    app.get('/api/display', {
      schema: {
        tags: ['Device'],
        summary: 'Get display data for a device',
        description: 'Retrieves the latest display data including image URL and firmware update information for a specific device',
        security: [{ apiKey: [] }],
        headers: {
          type: 'object',
          required: ['id', 'access-token'],
          properties: {
            'id': { type: 'string', description: 'Unique device identifier' },
            'access-token': { type: 'string', description: 'Authentication token' },
            'fw_version': { type: 'string', description: 'Device firmware version' },
            'refresh_rate': { type: 'string', description: 'Current device refresh rate' },
            'battery_voltage': { type: 'string', description: 'Current battery voltage' },
            'rssi': { type: 'string', description: 'Signal strength indicator' },
            'width': { type: 'string', description: 'Display width in pixels' },
            'height': { type: 'string', description: 'Display height in pixels' },
            'host': { type: 'string', description: 'Device host information' },
            'user_agent': { type: 'string', description: 'Device user agent' },
            'x-forwarded-for': { type: 'string', description: 'Original client IP' }
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
      const host = (req.headers['host'] as string) || (req.headers['x-forwarded-for'] as string) || '';
      
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

      // Create or update device with all properties
      const device = await this.deviceService.createOrUpdate({
        id,
        access_token: accessToken,
        firmware_version: fwVersion,
        host,
        user_agent: (req.headers['user_agent'] as string) || '',
        width,
        height,
        refresh_rate: refreshRate,
        battery_voltage: batteryVoltage,
        rssi,
        metadata: {
          ...req.headers,
          last_seen: new Date().toISOString(),
        }
      });

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
