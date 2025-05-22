import { FastifyPluginAsync } from 'fastify';
import fastifyMultipart, { FastifyMultipartOptions } from '@fastify/multipart';

export class MultipartPlugin {
    // This is what you pass into `server.register(...)`
    public static plugin: FastifyPluginAsync = async (fastify) => {
        const options: FastifyMultipartOptions = {
            attachFieldsToBody: false,
            // Add any multipart options here if needed
            // For example:
            // limits: {
            //     fileSize: 10 * 1024 * 1024, // 10MB limit
            //     files: 1,
            // },
        };
        await fastify.register(fastifyMultipart, options);
    };
}
