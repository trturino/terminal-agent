import { Repository } from 'typeorm';
import { DeviceEntity } from '../entities/Device';
import { Device } from '../models/Device';
import { IFileService } from '../interfaces/IFileService';
import { IDeviceService } from '../interfaces/IDeviceService';
import { DB } from '../database/DB';

export class DeviceService implements IDeviceService {
  private deviceRepository: Repository<DeviceEntity>;

  constructor(private readonly fileService: IFileService) {
    // We'll initialize the repository in the init method
    this.deviceRepository = null as unknown as Repository<DeviceEntity>;
  }

  // Initialize the repository with the database connection
  public async init(): Promise<void> {
    this.deviceRepository = DB.getDataSource().getRepository(DeviceEntity);
  }

  async findById(id: string | number): Promise<Device | null> {
    const where = typeof id === 'number' || !isNaN(Number(id))
      ? { deviceId: Number(id) }
      : { id };

    const deviceEntity = await this.deviceRepository.findOne({ where });
    return deviceEntity ? this.mapToDevice(deviceEntity) : null;
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
    device.filename = newFilename;
    const updatedDevice = await this.createOrUpdate(device);

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

  async createOrUpdate(deviceData: Partial<Device>): Promise<Device> {
    let deviceEntity: DeviceEntity;

    if (deviceData.deviceId) {
      // Update existing device
      const existingDevice = await this.deviceRepository.findOne({ where: { deviceId: deviceData.deviceId } });
      if (!existingDevice) {
        throw new Error(`Device with ID ${deviceData.deviceId} not found`);
      }
      deviceEntity = existingDevice;

      // Update fields
      if (deviceData.id) deviceEntity.id = deviceData.id;
      if (deviceData.accessToken) deviceEntity.accessToken = deviceData.accessToken;
      if (deviceData.firmwareVersion) deviceEntity.firmwareVersion = deviceData.firmwareVersion;
      if (deviceData.host) deviceEntity.host = deviceData.host;
      if (deviceData.userAgent) deviceEntity.userAgent = deviceData.userAgent;
      if (deviceData.width) deviceEntity.width = deviceData.width;
      if (deviceData.height) deviceEntity.height = deviceData.height;
      if (deviceData.refreshRate) deviceEntity.refreshRate = deviceData.refreshRate;
      if (deviceData.batteryVoltage) deviceEntity.batteryVoltage = deviceData.batteryVoltage;
      if (deviceData.rssi) deviceEntity.rssi = deviceData.rssi;
      if (deviceData.filename) deviceEntity.filename = deviceData.filename;
      if (deviceData.lastSeenAt) deviceEntity.lastSeenAt = deviceData.lastSeenAt;
    } else {
      // Create new device
      deviceEntity = this.deviceRepository.create({
        id: deviceData.id,
        accessToken: deviceData.accessToken,
        firmwareVersion: deviceData.firmwareVersion,
        host: deviceData.host,
        userAgent: deviceData.userAgent,
        width: deviceData.width,
        height: deviceData.height,
        refreshRate: deviceData.refreshRate,
        batteryVoltage: deviceData.batteryVoltage,
        rssi: deviceData.rssi,
        filename: deviceData.filename,
        lastSeenAt: deviceData.lastSeenAt
      });
    }

    // Save the entity
    const savedDevice = await this.deviceRepository.save(deviceEntity);

    // Return a mapped Device instance
    return this.mapToDevice(savedDevice);
  }

  async registerDevice(
    id: string,
    accessToken: string,
    firmwareVersion?: string
  ): Promise<Device> {
    // First try to find existing device by id
    let device = await this.findById(id);

    if (device) {
      // Update existing device
      device.accessToken = accessToken;
      if (firmwareVersion) {
        device.firmwareVersion = firmwareVersion;
      }
    } else {
      // Create new device
      device = new Device({
        id,
        accessToken,
        firmwareVersion
      });
    }

    return this.createOrUpdate(device);
  }

  async getDevice(id: string): Promise<Device | null> {
    return this.findById(id);
  }

  private mapToDevice(entity: DeviceEntity): Device {
    return new Device({
      deviceId: entity.deviceId,
      id: entity.id,
      accessToken: entity.accessToken,
      firmwareVersion: entity.firmwareVersion,
      host: entity.host,
      userAgent: entity.userAgent,
      width: entity.width,
      height: entity.height,
      refreshRate: entity.refreshRate,
      batteryVoltage: entity.batteryVoltage,
      rssi: entity.rssi,
      filename: entity.filename,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      lastSeenAt: entity.lastSeenAt
    });
  }
}
