export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  queueName: string;
}

export interface BrowserPoolConfig {
  poolSize: number;
  maxContexts: number;
  chromiumArgs: string[];
  statsInterval: number;
  shutdownTimeout: number;
}

export interface AwsConfig {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

export interface WorkerConfig {
  env: string;
  logLevel: string;
  redis: RedisConfig;
  browserPool: BrowserPoolConfig;
  aws: AwsConfig;
}

export class Config {
  private static instance: Config;
  private _config: WorkerConfig;

  private constructor() {
    this._config = this.loadConfig();
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get config(): WorkerConfig {
    return this._config;
  }

  private loadConfig(): WorkerConfig {
    return {
      env: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        queueName: process.env.REDIS_QUEUE_NAME || 'terminal-agent-queue',
      },
      browserPool: {
        poolSize: parseInt(process.env.POOL_SIZE || '6', 10),
        maxContexts: parseInt(process.env.MAX_CONTEXTS || '500', 10),
        chromiumArgs: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          ...(process.env.PLAYWRIGHT_CHROMIUM_ARGS?.split(' ') || [])
        ],
        statsInterval: 30000, // 30 seconds
        shutdownTimeout: 30000 // 30 seconds
      },
      aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        bucket: process.env.S3_BUCKET || 'terminal-images',
        forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === 'true' || false
      }
    };
  }
}
