import { db } from '../config/Database.js';
import { Device, DeviceData } from '../models/Device.js';
import { IDeviceService } from '../interfaces/IDeviceService.js';
import { IFileService } from '@terminal-agent/shared';

export class DeviceService implements IDeviceService {
  private fileService: IFileService;

  constructor(fileService: IFileService) {
    this.fileService = fileService;
  }
  async findById(id: string | number): Promise<Device | null> {
    const isNumericId = typeof id === 'number' || !isNaN(Number(id));
    const query = isNumericId
      ? 'SELECT * FROM devices WHERE device_id = $1'
      : 'SELECT * FROM devices WHERE id = $1';

    const result = await db.getPool().query<DeviceData>(
      query,
      [id]
    );

    if (!result.rows[0]) return null;
    return this.mapToDevice(result.rows[0]);
  }

  /**
   * Updates the device's filename and cleans up old file if it exists
   */
  async updateDeviceFile(deviceId: string, newFilename: string, oldFilename?: string): Promise<Device> {
    const device = await this.findById(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    // Update the device with new filename
    const updatedDevice = await this.createOrUpdate({
      ...device,
      filename: newFilename
    });

    // Clean up old file if it exists and is different from the new one
    if (oldFilename && oldFilename !== newFilename) {
      try {
        await this.fileService.deleteFile(deviceId, oldFilename);
      } catch (error) {
        console.error(`Failed to delete old file ${oldFilename}:`, error);
        // Don't fail the operation if cleanup fails
      }
    }

    return updatedDevice;
  }

  async createOrUpdate(deviceData: Omit<DeviceData, 'created_at' | 'updated_at' | 'last_seen_at'>): Promise<Device> {
    const {
      device_id,
      id,
      access_token,
      friendly_id,
      firmware_version,
      width,
      height,
      refresh_rate,
      battery_voltage,
      rssi,
      filename
    } = deviceData;

    // If we have a device_id, this is an update
    if (device_id) {
      const result = await db.getPool().query<DeviceData>(
        `UPDATE devices SET
          access_token = $2,
          friendly_id = $3,
          firmware_version = $4,
          width = $5,
          height = $6,
          refresh_rate = $7,
          battery_voltage = $8,
          rssi = $9,
          filename = $10,
          updated_at = CURRENT_TIMESTAMP
        WHERE device_id = $1
        RETURNING *`,
        [
          device_id,
          access_token,
          friendly_id,
          firmware_version,
          width,
          height,
          refresh_rate,
          battery_voltage,
          rssi,
          filename
        ]
      );
      return this.mapToDevice(result.rows[0]);
    } else {
      // Otherwise, this is an insert or upsert
      const result = await db.getPool().query<DeviceData>(
        `INSERT INTO devices (
          id, access_token, friendly_id, firmware_version,
          width, height, refresh_rate, battery_voltage, rssi, filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          friendly_id = COALESCE(EXCLUDED.friendly_id, devices.friendly_id),
          firmware_version = COALESCE(EXCLUDED.firmware_version, devices.firmware_version),
          width = COALESCE(EXCLUDED.width, devices.width),
          height = COALESCE(EXCLUDED.height, devices.height),
          refresh_rate = COALESCE(EXCLUDED.refresh_rate, devices.refresh_rate),
          battery_voltage = COALESCE(EXCLUDED.battery_voltage, devices.battery_voltage),
          rssi = COALESCE(EXCLUDED.rssi, devices.rssi),
          filename = COALESCE(EXCLUDED.filename, devices.filename),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          id,
          access_token,
          friendly_id,
          firmware_version,
          width,
          height,
          refresh_rate,
          battery_voltage,
          rssi,
          filename
        ]
      );
      return this.mapToDevice(result.rows[0]);
    }
  }



  async registerDevice(
    id: string,
    accessToken: string,
    options: {
      firmwareVersion?: string;
      friendlyId?: string;
      width?: number;
      height?: number;
      refreshRate?: number;
      batteryVoltage?: number;
      rssi?: number;
      filename?: string;
    } = {}
  ): Promise<Device> {
    const {
      firmwareVersion = '',
      friendlyId,
      width = 0,
      height = 0,
      refreshRate = 0,
      batteryVoltage = 0,
      rssi = 0,
      filename = 'empty_state'
    } = options;
    // Generate a friendly ID if not provided
    const generatedFriendlyId = friendlyId || Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Create or update the device with initial values
    return this.createOrUpdate({
      id,
      access_token: accessToken,
      friendly_id: generatedFriendlyId,
      firmware_version: firmwareVersion,
      width,
      height,
      refresh_rate: refreshRate,
      battery_voltage: batteryVoltage,
      rssi,
      filename
    });
  }

  async getDevice(id: string): Promise<Device | null> {
    return this.findById(id);
  }

  async listDevices(skip: number = 0, limit: number = 10): Promise<{ data: Device[], total: number }> {
    // Get total count
    const countResult = await db.getPool().query<{ count: string }>('SELECT COUNT(*) FROM devices');
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const result = await db.getPool().query<DeviceData>(
      'SELECT * FROM devices ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, skip]
    );

    return {
      data: result.rows.map(row => this.mapToDevice(row)),
      total
    };
  }

  async updateDevice(id: string, updateData: Partial<Omit<DeviceData, 'id' | 'device_id' | 'created_at' | 'updated_at' | 'last_seen_at'>>): Promise<Device | null> {
    const device = await this.findById(id);
    if (!device) {
      return null;
    }

    // Update only the provided fields
    const updatedDevice = {
      ...device,
      ...updateData,
      updated_at: new Date()
    };

    const result = await this.createOrUpdate(updatedDevice);
    return result;
  }

  async deleteDevice(id: string): Promise<boolean> {
    const result = await db.getPool().query(
      'DELETE FROM devices WHERE id = $1 RETURNING *',
      [id]
    );
    return (result.rowCount || 0) > 0;
  }

  public mapToDevice(data: DeviceData): Device {
    const device = new Device(data);
    device.created_at = data.created_at;
    device.updated_at = data.updated_at;
    device.last_seen_at = data.last_seen_at;
    return device;
  }
}
