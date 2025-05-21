import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('devices')
export class DeviceEntity {
  @PrimaryGeneratedColumn('increment', { name: 'device_id' })
  deviceId!: number;

  @Column({ type: 'varchar', unique: true })
  id!: string;

  @Column({ type: 'varchar', name: 'access_token' })
  accessToken!: string;

  @Column({ type: 'varchar', name: 'firmware_version', nullable: true })
  firmwareVersion?: string;

  @Column({ type: 'varchar', nullable: true })
  host?: string;

  @Column({ type: 'varchar', name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ type: 'integer', nullable: true })
  width?: number;

  @Column({ type: 'integer', name: 'height', nullable: true })
  height?: number;

  @Column({ type: 'integer', name: 'refresh_rate', nullable: true })
  refreshRate?: number;

  @Column({ type: 'float', name: 'battery_voltage', nullable: true })
  batteryVoltage?: number;

  @Column({ type: 'integer', nullable: true })
  rssi?: number;

  @Column({ type: 'varchar', nullable: true })
  filename?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  // Helper method to convert to plain object with snake_case for API responses
  toJSON(): Record<string, any> {
    const { deviceId, accessToken, firmwareVersion, userAgent, refreshRate, createdAt, updatedAt, lastSeenAt, ...rest } = this;
    
    return {
      device_id: deviceId,
      access_token: accessToken,
      firmware_version: firmwareVersion,
      user_agent: userAgent,
      refresh_rate: refreshRate,
      created_at: createdAt,
      updated_at: updatedAt,
      last_seen_at: lastSeenAt,
      ...rest
    };
  }
}
