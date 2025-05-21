import { JsonSerializable, Timestamped } from './BaseModel';

export interface DeviceData extends Timestamped {
  device_id?: number;  // Auto-incrementing primary key
  id: string;          // External device identifier (kept as unique)
  access_token: string;
  firmware_version?: string;
  host?: string;
  user_agent?: string;
  width?: number;
  height?: number;
  refresh_rate?: number;
  battery_voltage?: number;
  rssi?: number;
  filename?: string;
}

export class Device implements DeviceData, JsonSerializable<DeviceData> {
  device_id?: number;  // Auto-incrementing primary key
  id: string;          // External device identifier (kept as unique)
  access_token: string;
  firmware_version?: string;
  host?: string;
  user_agent?: string;
  width?: number;
  height?: number;
  refresh_rate?: number;
  battery_voltage?: number;
  rssi?: number;
  filename?: string;
  created_at?: Date;
  updated_at?: Date;
  last_seen_at?: Date;

  constructor(data: DeviceData) {
    this.device_id = data.device_id;
    this.id = data.id;
    this.access_token = data.access_token;
    this.firmware_version = data.firmware_version;
    this.host = data.host;
    this.user_agent = data.user_agent;
    this.width = data.width;
    this.height = data.height;
    this.refresh_rate = data.refresh_rate;
    this.battery_voltage = data.battery_voltage;
    this.rssi = data.rssi;
    this.filename = data.filename;
  }

  // Helper method to convert to plain object
  toJSON(): DeviceData {
    return {
      device_id: this.device_id,
      id: this.id,
      access_token: this.access_token,
      firmware_version: this.firmware_version,
      host: this.host,
      user_agent: this.user_agent,
      width: this.width,
      height: this.height,
      refresh_rate: this.refresh_rate,
      battery_voltage: this.battery_voltage,
      rssi: this.rssi,
      filename: this.filename,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_seen_at: this.last_seen_at
    };
  }
}
