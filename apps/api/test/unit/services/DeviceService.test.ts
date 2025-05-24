import { DeviceService } from '../../../src/services/DeviceService';
import { IFileService } from '@terminal-agent/shared';
import { Device } from '../../../src/models/Device';
// Use type-only import to avoid runtime error
import type { Pool } from 'pg';

// Mock FileService
const mockFileService: jest.Mocked<IFileService> = {
  getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/presigned-url'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  uploadFile: jest.fn().mockImplementation((_deviceId, _file, filename) => Promise.resolve(filename || 'generated-filename.bmp')),
  getFileMetadata: jest.fn().mockResolvedValue({
    size: 1024,
    contentType: 'image/bmp',
    lastModified: new Date(),
    etag: 'test-etag',
  })
};

// Mock database
const mockQuery = jest.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

// Mock the database module
jest.mock('../../../src/config/database', () => ({
  db: {
    getPool: jest.fn(() => mockPool),
  },
}));

// Create a test instance of DeviceService
const createTestDeviceService = () => {
  return new DeviceService(mockFileService);
};

// Helper function to create a mock device
const createMockDevice = (overrides: Partial<Device> = {}): Device => {
  const now = new Date();
  return new Device({
    device_id: 1,
    id: 'test-device-1',
    access_token: 'test-access-token',
    friendly_id: 'Test Device',
    firmware_version: '1.0.0',
    host: 'test-host',
    user_agent: 'test-user-agent',
    width: 800,
    height: 600,
    refresh_rate: 30,
    battery_voltage: 3.7,
    rssi: -60,
    filename: 'test-file.bmp',
    created_at: now,
    updated_at: now,
    last_seen_at: now,
    ...overrides,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DeviceService', () => {
  const mockDbResponse = (rows: any[] = []) => ({
    rows,
    rowCount: rows.length,
    command: 'SELECT',
    oid: 0,
    fields: [],
  });

  describe('findById', () => {
    it('should find a device by numeric ID', async () => {
      const deviceService = createTestDeviceService();
      const mockDevice = createMockDevice({ id: '123', device_id: 123 });
      mockQuery.mockResolvedValueOnce(mockDbResponse([mockDevice.toJSON()]));

      const result = await deviceService.findById(123);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM devices WHERE device_id = $1', [123]);
      expect(result).toEqual(expect.objectContaining({
        id: '123',
        device_id: mockDevice.device_id,
      }));
    });

    it('should find a device by string ID', async () => {
      const deviceService = createTestDeviceService();
      const mockDevice = createMockDevice({ id: 'test-device-1' });
      mockQuery.mockResolvedValueOnce(mockDbResponse([mockDevice.toJSON()]));

      const result = await deviceService.findById('test-device-1');

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM devices WHERE id = $1', ['test-device-1']);
      expect(result).toEqual(expect.objectContaining({
        id: 'test-device-1',
        device_id: mockDevice.device_id,
      }));
    });

    it('should return null when device is not found', async () => {
      const deviceService = createTestDeviceService();
      mockQuery.mockResolvedValueOnce(mockDbResponse([]));

      const result = await deviceService.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateDeviceFile', () => {
    it('should update device file and clean up old file', async () => {
      const deviceService = createTestDeviceService();
      const oldFilename = 'old-file.bmp';
      const newFilename = 'new-file.bmp';
      const deviceId = 'test-device-1';

      const mockDevice = createMockDevice({
        id: deviceId,
        filename: oldFilename,
      });

      // Mock database response
      const mockDeviceData = { ...mockDevice, filename: oldFilename };
      mockQuery.mockResolvedValueOnce(mockDbResponse([mockDeviceData]));

      // Mock update response
      const updatedDevice = { ...mockDeviceData, filename: newFilename };
      mockQuery.mockResolvedValueOnce(mockDbResponse([updatedDevice]));

      const result = await deviceService.updateDeviceFile(deviceId, newFilename, oldFilename);

      // Verify database was queried for the device
      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM devices WHERE id = $1', [deviceId]);

      // Verify device was updated with new filename
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE devices SET'),
        expect.arrayContaining([newFilename])
      );

      // Verify old file was deleted
      expect(mockFileService.deleteFile).toHaveBeenCalledWith(deviceId, oldFilename);

      // Verify result contains updated device
      expect(result).toEqual(expect.objectContaining({
        id: deviceId,
        filename: newFilename
      }));
    });

    it('should throw error if device is not found', async () => {
      const deviceService = createTestDeviceService();
      mockQuery.mockResolvedValueOnce(mockDbResponse([]));

      await expect(
        deviceService.updateDeviceFile('non-existent', 'new-file.bmp', 'old-file.bmp')
      ).rejects.toThrow('Device not found');
    });
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      // Create a test instance of DeviceService
      const deviceService = createTestDeviceService();

      const deviceId = 123;
      const now = new Date();

      // Create a device data object that matches the DeviceData interface
      const deviceData = {
        device_id: deviceId,
        id: 'test-device-1',
        access_token: 'new-token',
        firmware_version: '1.1.0',
        host: 'new-host',
        user_agent: 'new-user-agent',
        width: 800,
        height: 600,
        refresh_rate: 30,
        battery_voltage: 3.7,
        rssi: -60,
        filename: 'test.bmp',
        metadata: {
          test: 'value',
        },
        created_at: now,
        updated_at: now,
        last_seen_at: now,
      };

      // Mock the database query to return the registered device
      mockQuery.mockResolvedValueOnce({
        rows: [deviceData],
        rowCount: 1,
      });

      // Call the registerDevice method
      const result = await deviceService.registerDevice(
        'test-device-1',
        'new-token',
        { 
          firmwareVersion: '1.1.0',
          friendlyId: 'Test Device'
        }
      );

      // Verify the database query was called with correct parameters
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO devices'),
        expect.anything()
      );

      // Verify the result contains the registered device
      expect(result).toEqual(expect.objectContaining({
        id: 'test-device-1',
        access_token: 'new-token',
      }));
    });

    it('should create a new device if it does not exist', async () => {
      const deviceService = createTestDeviceService();
      const newDevice = {
        id: 'new-device',
        access_token: 'new-token',
        firmware_version: '1.0.0',
        host: 'localhost',
        user_agent: 'test-agent',
        width: 400,
        height: 300,
        refresh_rate: 60,
        battery_voltage: 3.8,
        rssi: -50,
        filename: 'default.bmp',
        metadata: { test: 'new' },
      };

      const mockDevice = {
        ...newDevice,
        device_id: 1,
        created_at: new Date(),
        updated_at: new Date(),
        last_seen_at: new Date()
      };

      mockQuery.mockResolvedValueOnce(mockDbResponse([mockDevice]));

      // Call the registerDevice method
      const result = await deviceService.registerDevice(
        'new-device',
        'new-token',
        { 
          firmwareVersion: '1.0.0',
          friendlyId: 'New Test Device'
        }
      );

      // Verify the database query was called with correct parameters
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO devices'),
        expect.arrayContaining([
          'new-device',
          'new-token',
          '1.0.0',
          'New Test Device',
          expect.any(String), // host
          expect.any(String), // user_agent
          expect.any(Number), // width
          expect.any(Number), // height
          expect.any(Number), // refresh_rate
          expect.any(Number), // battery_voltage
          expect.any(Number), // rssi
          expect.any(String)  // filename
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'new-device',
        deviceId: 1,
      }));
    });
  });
});
