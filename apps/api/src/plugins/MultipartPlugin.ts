import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifyMultipart from '@fastify/multipart';

// Type for our multipart options
export class MultipartPlugin {
    // This is what you pass into `server.register(...)`
    public static plugin: FastifyPluginAsync = fp(async (fastify) => {
        // Register the multipart plugin
        await fastify.register(fastifyMultipart, {
            attachFieldsToBody: true, // Set to false to use request.file()
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB limit
                files: 1, // Only allow one file at a time
                fieldSize: 1 * 1024 * 1024, // 1MB limit for other fields
                fieldNameSize: 100,
                fields: 5, // Limit number of other fields
            },
            throwFileSizeLimit: true,
            onFile: (part: any) => {
                const filename = part.filename;
                const mimetype = part.mimetype;
                if (filename) {
                    fastify.log.info(`Processing file ${filename} with mimetype ${mimetype}`);
                }
            }
        });
    });
}
