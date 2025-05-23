import Redis, { Redis as RedisClientType, RedisOptions } from 'ioredis';
import { Config } from '../config/config';
import { logger } from '../utils/logger';

const loggerWithContext = logger.child({ module: 'redis' });

export class RedisClient {
  private client: RedisClientType;
  private isConnected: boolean = false;
  private config = Config.getInstance();

  constructor() {
    const { host, port, password, db } = this.config.config.redis;
    const options: RedisOptions = {
      host,
      port,
      password,
      db,
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true,
    };
    
    this.client = new Redis(options);
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      loggerWithContext.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      loggerWithContext.error({ error: error.message }, 'Redis client error');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      loggerWithContext.warn('Redis client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      loggerWithContext.info('Redis client reconnecting...');
    });

    this.client.on('ready', () => {
      loggerWithContext.info('Redis client ready');
      this.isConnected = true;
    });
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
