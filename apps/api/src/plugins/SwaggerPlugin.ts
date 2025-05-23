// src/plugins/SwaggerPlugin.ts
import { FastifyPluginAsync, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { Config } from '../config/Config.js';

export class SwaggerPlugin {
  /**
   * Registers @fastify/swagger & @fastify/swagger-ui,
   * exposing OpenAPI docs at /docs.
   */
  public static plugin: FastifyPluginAsync = fp(async (fastify) => {
    const cfg = new Config();
    const serverUrl = `http://127.0.0.1:${cfg.port}`;

    // Generate OpenAPI spec
    await fastify.register(swagger, {
      openapi: {
        info: {
          title: cfg.swagger.title,
          version: cfg.swagger.version,
          description: cfg.swagger.description,
        },
        servers: [
          {
            url: serverUrl,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            apiKey: {
              type: 'apiKey',
              name: 'Access-Token',
              in: 'header',
              description: 'Access token for API authentication',
            },
          },
        },
      },
      hideUntagged: false,
      exposeRoute: true,
    });

    // Serve Swagger UI
    await fastify.register(swaggerUI, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
        displayRequestDuration: true,
        filter: true,
      },
      staticCSP: true,
      transformStaticCSP: (header) => header,
      transformSpecification: (swaggerObject) => {
        return swaggerObject;
      },
    });

  });
}