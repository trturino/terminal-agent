import { FastifyInstance } from 'fastify';
import { DeviceController } from '../../../src/controllers/DeviceController';
import { DeviceService } from '../../../src/services/DeviceService';
import { createTestServer, resetMocks } from '../../utils/testUtils';
import { Device } from '../../../src/models/Device';
import { mockFileService } from '../../setupTests';

// Mock the DeviceService
const mockCreateOrUpdate = jest.fn();
const mockFindById = jest.fn();

jest.mock('../../../src/services/DeviceService', () => ({
  DeviceService: jest.fn().mockImplementation(() => ({
    createOrUpdate: mockCreateOrUpdate,
    findById: mockFindById,
  })),
  __esModule: true,
}));



// Helper function to create a mock device
const createMockDevice = (overrides: Partial<Device> = {}): Device => {
  const now = new Date();
  return new Device({
    id: 'test-device-1',
    device_id: 1,
    access_token: 'test-access-token',
    firmware_version: '1.0.0',
    host: 'test-host',
    user_agent: 'test-user-agent',
    width: 800,
    height: 600,
    refresh_rate: 30,
    battery_voltage: 3.7,
    rssi: -60,
    filename: 'test-file.bmp',
    metadata: {
      last_seen: now.toISOString(),
    },
    created_at: now,
    updated_at: now,
    last_seen_at: now,
    ...overrides,
  });
};

let server: FastifyInstance;

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockCreateOrUpdate.mockClear();
  mockFindById.mockClear();
});

describe('DeviceController', () => {
  beforeEach(async () => {
    resetMocks();
    server = await createTestServer();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Mock the FileService instance
    mockFileService.getPresignedUrl.mockReset();
    mockFileService.deleteFile.mockReset();
    
    // Register routes using the static register method
    
    // Reset the mock implementation for createOrUpdate
    mockCreateOrUpdate.mockReset();
    mockFindById.mockReset();
  });

  afterEach(async () => {
    await server.close();
    jest.clearAllMocks();
  });

  describe('GET /api/display', () => {
    let mockDevice: Device;
    
    beforeEach(() => {
      mockDevice = createMockDevice();
    });
    
    it('should return 400 if id or access-token headers are missing', async () => {
      const testCases = [
        { headers: { 'id': 'test-id' } },
        { headers: { 'access-token': 'test-token' } },
        { headers: {} },
      ];

      for (const testCase of testCases) {
        const response = await server.inject({
          method: 'GET',
          url: '/api/display',
          headers: testCase.headers,
        });

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.payload)).toHaveProperty('error', 'ID and Access-Token headers required');
      }
    });

    it('should create or update device and return display data', async () => {
      const mockDisplayData = {
        filename: 'test-file.bmp',
        image_url: 'https://example.com/presigned-url',
        image_url_timeout: 0,
        refresh_rate: 30,
        reset_firmware: false,
        special_function: 'sleep',
        update_firmware: false,
      };

      // Mock the FileService to return a presigned URL
      const { FileService } = require('../../../src/services/FileService');
      const mockFileServiceInstance = {
        getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/presigned-url'),
      };
      FileService.mockImplementation(() => mockFileServiceInstance);
      
      mockCreateOrUpdate.mockResolvedValue(mockDevice);

      const response = await server.inject({
        method: 'GET',
        url: '/api/display',
        headers: {
          'id': 'test-device-1',
          'access-token': 'test-token',
          'fw_version': '1.0.0',
          'host': 'test-host',
          'user_agent': 'test-user-agent',
          'width': '800',
          'height': '600',
          'refresh_rate': '30',
          'battery_voltage': '3.7',
          'rssi': '-60',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toMatchObject(mockDisplayData);
      
      // Verify DeviceService.createOrUpdate was called with correct parameters
      expect(mockCreateOrUpdate).toHaveBeenCalledWith({
        id: 'test-device-1',
        access_token: 'test-token',
        firmware_version: '1.0.0',
        host: 'test-host',
        user_agent: 'test-user-agent',
        width: 800,
        height: 600,
        refresh_rate: 30,
        battery_voltage: 3.7,
        rssi: -60,
        metadata: expect.objectContaining({
          last_seen: expect.any(String),
        }),
      });
    });

    it('should handle errors during device update', async () => {
      // Mock the error case
      mockCreateOrUpdate.mockRejectedValueOnce(new Error('Database error'));
      
      // Mock FileService to return a presigned URL
      mockFileService.getPresignedUrl.mockResolvedValueOnce('https://example.com/presigned-url');

      const response = await server.inject({
        method: 'GET',
        url: '/api/display',
        headers: {
          'id': 'test-device-1',
          'access-token': 'test-token',
        },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.payload)).toHaveProperty('error', 'Internal server error');
    });
  });
});
