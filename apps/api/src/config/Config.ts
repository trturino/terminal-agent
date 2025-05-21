import 'dotenv/config';

export interface S3Config {
  region: string;
  bucketName: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
}

export class Config {
  public readonly port = Number(process.env.PORT ?? 3000);
  public readonly host = process.env.HOST ?? '0.0.0.0';
  public readonly corsOrigin = (process.env.CORS_ORIGIN ?? '*').split(',');
  public readonly rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 100);
  public readonly rateLimitWindow = '1 minute' as const;
  public readonly swagger = {
    title: process.env.SWAGGER_TITLE ?? 'Terminal Agent API',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
    description: process.env.SWAGGER_DESC ?? 'Terminal Agent REST API',
  };
  public readonly logLevel = process.env.LOG_LEVEL ?? 'info';
  public readonly nodeEnv = process.env.NODE_ENV ?? 'development';
  public readonly s3: S3Config;
  public readonly db: DatabaseConfig;

  constructor() {
    this.s3 = this.getS3Config();
    this.db = this.getDbConfig();
  }

  private getS3Config(): S3Config {
    const config: S3Config = {
      region: process.env.S3_REGION || 'us-east-1',
      bucketName: process.env.S3_BUCKET_NAME || 'terminal-agent',
    };

    // For local development or custom endpoints
    if (process.env.S3_ENDPOINT) {
      config.endpoint = process.env.S3_ENDPOINT;
      config.forcePathStyle = true;
    }

    // Validate required S3 config
    if (!config.bucketName) {
      throw new Error('S3 bucket name is not configured. Set S3_BUCKET_NAME environment variable.');
    }

    return config;
  }

  private getDbConfig(): DatabaseConfig {
    const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
    
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'terminal_agent',
      ssl,
    };
  }
}