// src/plugins/CorsPlugin.ts
import { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import { Config } from '../config/Config.js';

export class CorsPlugin {
    /**
     * Registers @fastify/cors with settings from Config.
     * Allows cross-origin requests from configured origins.
     */
    public static plugin: FastifyPluginAsync = async (fastify) => {
        const cfg = new Config();
        await fastify.register(cors, {
            origin: cfg.corsOrigin,
            credentials: true,
            // you can add additional options here, for example:
            // methods: ['GET', 'POST', 'PUT', 'DELETE'],
            // allowedHeaders: ['Content-Type', 'Authorization'],
        });
    };
}