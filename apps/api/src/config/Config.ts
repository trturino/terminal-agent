import 'dotenv/config';

export interface S3Config {
  region: string;
  imagesBucketName: string;
  pluginsBucketName: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  tls?: {
    rejectUnauthorized: boolean;
    requestCert: boolean;
    agent: boolean;
  };
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
  public readonly redis: RedisConfig;

  constructor() {
    this.s3 = this.getS3Config();
    this.redis = this.getRedisConfig();
  }

  private getS3Config(): S3Config {
    const config: S3Config = {
      region: process.env.S3_REGION || 'us-east-1',
      imagesBucketName: process.env.S3_BUCKET_NAME || 'terminal-agent-images',
      pluginsBucketName: process.env.S3_PLUGINS_BUCKET_NAME || 'terminal-agent-plugins',
    };

    // For local development or custom endpoints
    if (process.env.AWS_ENDPOINT_URL) {
      config.endpoint = process.env.AWS_ENDPOINT_URL;
      config.forcePathStyle = true;
    } else {
      config.forcePathStyle = false;
    }

    // Validate required S3 config
    if (!config.imagesBucketName) {
      throw new Error('S3 images bucket name is not configured. Set S3_BUCKET_NAME environment variable.');
    }

    return config;
  }

  private getRedisConfig(): RedisConfig {
    const config: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      db: parseInt(process.env.REDIS_DB || '0', 10),
    };

    if (process.env.REDIS_PASSWORD) {
      config.password = process.env.REDIS_PASSWORD;
    }

    // Enable TLS in production or when explicitly requested
    if (process.env.REDIS_TLS === 'true' || this.nodeEnv === 'production') {
      config.tls = {
        rejectUnauthorized: false,
        requestCert: true,
        agent: false,
      };
    }

    return config;
  }
}