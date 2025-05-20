import 'dotenv/config';

export class Config {
  public readonly port = Number(process.env.PORT ?? 3000);
  public readonly host = process.env.HOST ?? '0.0.0.0';
  public readonly corsOrigin = (process.env.CORS_ORIGIN ?? '*').split(',');
  public readonly rateLimitMax = Number(process.env.RATE_LIMIT_MAX ?? 100);
  public readonly rateLimitWindow = '1 minute' as const;
  public readonly swagger = {
    title: process.env.SWAGGER_TITLE ?? 'My Fastify API',
    version: process.env.SWAGGER_VERSION ?? '1.0.0',
    description: process.env.SWAGGER_DESC ?? 'Production-ready REST API',
  };
  public readonly logLevel = process.env.LOG_LEVEL ?? 'info';
  public readonly nodeEnv = process.env.NODE_ENV ?? 'development';
}