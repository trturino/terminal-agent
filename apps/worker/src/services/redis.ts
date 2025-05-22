import Redis, { Redis as RedisClientType, RedisOptions } from 'ioredis';
import { Config } from '../config/config';
import { createLogger } from '../utils/logger';

const logger = createLogger('redis');

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
      this.isConnected = true;
      logger.info('Connected to Redis');
    });

    this.client.on('error', (error) => {
      logger.error('Redis error:', error);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Disconnected from Redis');
    });
  }

  getClient(): RedisClientType {
    return this.client;
  }
}
