// src/plugins/HelmetPlugin.ts
import { FastifyPluginAsync } from 'fastify';
import helmet from '@fastify/helmet';
import { Config } from '../config/Config.js';

export class HelmetPlugin {
    public static plugin: FastifyPluginAsync = async (fastify) => {
        const cfg = new Config();

        await fastify.register(helmet, {
            contentSecurityPolicy: cfg.nodeEnv === 'production',
        });
    };
}