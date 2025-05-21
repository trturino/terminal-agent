import { JsonSerializable } from './BaseModel';
import { DeviceEntity } from '../entities/Device';

export interface IDeviceData {
  deviceId?: number;
  id: string;
  accessToken: string;
  firmwareVersion?: string;
  host?: string;
  userAgent?: string;
  width?: number;
  height?: number;
  refreshRate?: number;
  batteryVoltage?: number;
  rssi?: number;
  filename?: string;
  createdAt?: Date;
  updatedAt?: Date;
  lastSeenAt?: Date;
}

export class Device extends DeviceEntity implements JsonSerializable<IDeviceData> {
  constructor(data?: Partial<IDeviceData>) {
    super();
    if (data) {
      Object.assign(this, data);
    }
  }

  // Helper method to convert to plain object with snake_case for API responses
  toJSON(): IDeviceData & { [key: string]: any } {
    const { deviceId, accessToken, firmwareVersion, userAgent, refreshRate, batteryVoltage, lastSeenAt, ...rest } = this;
    
    return {
      deviceId,
      accessToken,
      firmwareVersion,
      userAgent,
      refreshRate,
      batteryVoltage,
      lastSeenAt,
      ...rest
    };
  }
}
