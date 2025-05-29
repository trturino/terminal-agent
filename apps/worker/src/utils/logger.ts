import { pino } from 'pino';
import { Config } from '../config/config.js';

export class Logger {
  public static readonly instance = (() => {
    const config = Config.getInstance().config;
    return pino({
      level: config.logLevel || (config.env === 'development' ? 'debug' : 'info'),
      ...(config.env !== 'production'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
      base: { service: 'worker' },
    });
  })();
}

export const logger = Logger.instance;
