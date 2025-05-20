// src/plugins/SwaggerPlugin.ts
import { FastifyPluginAsync } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { Config } from '../config/Config.js';

export class SwaggerPlugin {
  /**
   * Registers @fastify/swagger & @fastify/swagger-ui,
   * exposing OpenAPI docs at /docs.
   */
  public static plugin: FastifyPluginAsync = async (fastify) => {
    const cfg = new Config();

    // Generate OpenAPI spec
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: cfg.swagger.title,
          version: cfg.swagger.version,
          description: cfg.swagger.description,
        },
      },
    });

    // Serve Swagger UI
    await fastify.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
    });
  };
}