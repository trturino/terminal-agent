export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  queueName: string;
}

export interface WorkerConfig {
  env: string;
  logLevel: string;
  redis: RedisConfig;
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
    };
  }
}
