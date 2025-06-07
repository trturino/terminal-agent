// src/plugins/RateLimitPlugin.ts
import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { Config } from '../config/Config.js';

export class RateLimitPlugin {
    /**
     * Registers @fastify/rate-limit to protect your API
     * from excessive requests.
     */
    public static plugin: FastifyPluginAsync = async (fastify) => {
        const cfg = new Config();

        await fastify.register(rateLimit, {
            // maximum number of requests per time window
            max: cfg.rateLimitMax,
            // time window for rate limiting
            timeWindow: cfg.rateLimitWindow,
            // optional: return custom error message
            errorResponseBuilder: (request, context) => {
                const retryAfter = Math.ceil(Number(context.after) / 1000);
                return {
                    statusCode: 429,
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded, retry in ${retryAfter} seconds`,
                };
            },
            // optional: allow list certain IPs or routes
            // allowList: (request) => ['127.0.0.1'].includes(request.ip),
            // skipOnError: false,
        });
    };
}