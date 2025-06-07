import { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

export const resetMocks = () => {
  // Reset any mocks here if needed
};

export const createTestServer = async (): Promise<FastifyInstance> => {
  const fastify = require('fastify').default();
  
  // Add any test-specific plugins or decorators here
  
  // Return a promise that resolves with the Fastify instance
  return Promise.resolve(fastify);
};
