import { FastifyInstance } from "fastify";

export interface IController {
    registerRoutes(app: FastifyInstance): void;
}