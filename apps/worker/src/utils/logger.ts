import winston from 'winston';
import { Config } from '../config/config';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaString}`;
});

export function createLogger(service: string) {
  const config = Config.getInstance().config;
  const isDevelopment = config.env === 'development';

  return winston.createLogger({
    level: config.logLevel || (isDevelopment ? 'debug' : 'info'),
    defaultMeta: { service },
    format: combine(
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      isDevelopment ? combine(colorize(), logFormat) : json()
    ),
    transports: [new winston.transports.Console()],
  });
}
