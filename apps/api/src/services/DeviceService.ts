import { db } from '../config/Database';
import { Device, DeviceData } from '../models/Device';
import { IDeviceService } from '../interfaces/IDeviceService';
import { IFileService } from '../interfaces/IFileService';

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
      firmware_version,
      host,
      user_agent,
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
          firmware_version = $3,
          host = $4,
          user_agent = $5,
          width = $6,
          height = $7,
          refresh_rate = $8,
          battery_voltage = $9,
          rssi = $10,
          filename = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE device_id = $1
        RETURNING *`,
        [device_id, access_token, firmware_version, host, user_agent,
          width, height, refresh_rate, battery_voltage, rssi, filename]
      );
      return this.mapToDevice(result.rows[0]);
    } else {
      // This is an insert
      const result = await db.getPool().query<DeviceData>(
        `INSERT INTO devices (
          id, access_token, firmware_version, host, user_agent,
          width, height, refresh_rate, battery_voltage, rssi, filename
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          access_token = EXCLUDED.access_token,
          firmware_version = COALESCE(EXCLUDED.firmware_version, devices.firmware_version),
          host = COALESCE(EXCLUDED.host, devices.host),
          user_agent = COALESCE(EXCLUDED.user_agent, devices.user_agent),
          width = COALESCE(EXCLUDED.width, devices.width),
          height = COALESCE(EXCLUDED.height, devices.height),
          refresh_rate = COALESCE(EXCLUDED.refresh_rate, devices.refresh_rate),
          battery_voltage = COALESCE(EXCLUDED.battery_voltage, devices.battery_voltage),
          rssi = COALESCE(EXCLUDED.rssi, devices.rssi),
          filename = COALESCE(EXCLUDED.filename, devices.filename),
          updated_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [id, access_token, firmware_version, host, user_agent,
          width, height, refresh_rate, battery_voltage, rssi, filename]
      );
      return this.mapToDevice(result.rows[0]);
    }
  }



  async registerDevice(
    id: string,
    accessToken: string,
    firmwareVersion?: string
  ): Promise<Device> {
    return this.createOrUpdate({
      id,
      access_token: accessToken,
      firmware_version: firmwareVersion,
    });
  }

  async getDevice(id: string): Promise<Device | null> {
    return this.findById(id);
  }

  private mapToDevice(data: DeviceData): Device {
    const device = new Device(data);
    device.created_at = data.created_at;
    device.updated_at = data.updated_at;
    device.last_seen_at = data.last_seen_at;
    return device;
  }
}
