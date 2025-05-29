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
  pluginsBucket: string;
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
          // Allow Playwright to run the browser in a sandboxed environment.
          // This is a security feature to prevent malicious websites from
          // accessing sensitive information.
          '--no-sandbox',
          // Disable the setuid sandbox (Linux only).
          // This is a security feature to prevent malicious websites from
          // accessing sensitive information.
          '--disable-setuid-sandbox',
          // Disable the /dev/shm partition (Linux only).
          // This is a security feature to prevent malicious websites from
          // accessing sensitive information.
          '--disable-dev-shm-usage',
          // Disable hardware acceleration for the 2D canvas.
          // This is a performance feature to improve rendering performance.
          '--disable-accelerated-2d-canvas',
          // Disable the first-run dialog that asks the user to
          // set a default browser.
          '--no-first-run',
          // Disable the zygote process (Linux only).
          // This is a performance feature to improve startup performance.
          '--no-zygote',
          // Run the browser in a single process.
          // This is a performance feature to improve startup performance.
          '--single-process',
          // Disable the GPU process.
          // This is a performance feature to improve startup performance.
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
        bucket: process.env.S3_BUCKET_NAME || 'terminal-images',
        pluginsBucket: process.env.S3_PLUGINS_BUCKET_NAME || 'terminal-agent-plugins',
        forcePathStyle: process.env.AWS_FORCE_PATH_STYLE === 'true' || false
      }
    };
  }
}
