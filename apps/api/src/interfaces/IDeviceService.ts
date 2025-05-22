import { Device, DeviceData } from "../models/Device";

export interface IDeviceService {
  findById(id: string | number): Promise<Device | null>;
  updateDeviceFile(deviceId: string, newFilename: string, oldFilename?: string): Promise<Device>;
  createOrUpdate(deviceData: Omit<DeviceData, 'created_at' | 'updated_at' | 'last_seen_at'>): Promise<Device>;
  registerDevice(
    id: string,
    accessToken: string,
    options?: {
      firmwareVersion?: string;
      friendlyId?: string;
      width?: number;
      height?: number;
      refreshRate?: number;
      batteryVoltage?: number;
      rssi?: number;
      filename?: string;
    }
  ): Promise<Device>;
  getDevice(id: string): Promise<Device | null>;
}
