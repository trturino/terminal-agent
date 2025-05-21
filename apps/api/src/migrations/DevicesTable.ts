import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class DevicesTable implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'devices',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            isGenerated: false,
          },
          {
            name: 'deviceId',
            type: 'integer',
            isGenerated: true,
            generationStrategy: 'increment',
            isPrimary: false,
            isNullable: false,
          },
          {
            name: 'accessToken',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'firmwareVersion',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'host',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'width',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'height',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'refreshRate',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'batteryVoltage',
            type: 'float',
            isNullable: true,
          },
          {
            name: 'rssi',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'filename',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'lastSeenAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create an index on the deviceId column
    await queryRunner.query('CREATE INDEX IDX_devices_device_id ON devices(deviceId)');
    
    // Create an index on the accessToken column
    await queryRunner.query('CREATE INDEX IDX_devices_access_token ON devices(accessToken)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('devices');
  }
}
