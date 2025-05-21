import { DataSource, DataSourceOptions } from 'typeorm';
import { DeviceEntity } from '../entities/Device';
import { Config } from '../config/Config';

/**
 * Class to manage TypeORM data source configuration and instances
 */
export class DB {
  private dataSource: DataSource;
  private dataSourceOptions: DataSourceOptions;

  private constructor(private readonly config: Config) {
    const dbConfig = config.db;
    
    this.dataSourceOptions = {
      type: 'postgres',
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,
      entities: [DeviceEntity],
      synchronize: config.nodeEnv !== 'production', // Auto-create database schema (disable in production!)
      logging: config.nodeEnv === 'development',
      ssl: dbConfig.ssl,
    };

    this.dataSource = new DataSource(this.dataSourceOptions);
  }


  /**
   * Get the DataSource instance
   */
  public getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Get the DataSourceOptions
   */
  public getDataSourceOptions(): DataSourceOptions {
    return { ...this.dataSourceOptions };
  }

  /**
   * Initialize the data source
   */
  public async initialize(): Promise<DataSource> {
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    return this.dataSource;
  }

  /**
   * Close the data source
   */
  public async close(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }
}