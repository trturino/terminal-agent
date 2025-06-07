import { pino } from 'pino';

// Create a base logger instance that can be extended
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    }
  } : undefined,
  serializers: {
    error: pino.stdSerializers.err,
  },
});

export { logger };

export default logger;
