import { pino } from 'pino';
import { Config } from '../config/Config.js';

export class Logger {
  public static readonly instance = (() => {
    const cfg = new Config();
    return pino({
      level: cfg.logLevel,
      ...(cfg.nodeEnv !== 'production'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
    });
  })();
}