import { FastifyPluginAsync } from 'fastify';
import sensible from '@fastify/sensible';

export class SensiblePlugin {
    // This is what you pass into `server.register(...)`
    public static plugin: FastifyPluginAsync = async (fastify) => {
        // Registers @fastify/sensible with all its defaults
        await fastify.register(sensible);
    };
}