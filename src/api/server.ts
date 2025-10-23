import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import type { Telegram } from 'telegraf';
import { cfg } from '../core/config';
import { log } from '../core/logger';
import { toAppError } from '../core/errors';
import { registerProfileRoutes } from './routes/profile';
import { registerListingRoutes } from './routes/listings';
import { registerMediaRoutes } from './routes/media';

export interface HttpServerDeps {
  telegram: Telegram;
}

export type AppFastifyInstance = FastifyInstance & { telegram: Telegram };

export const createServer = ({ telegram }: HttpServerDeps): AppFastifyInstance => {
  const rawServer = Fastify({
    logger: false
  });
  const server = rawServer as unknown as AppFastifyInstance;

  server.decorate('telegram', telegram);

  const corsOrigins = cfg.http.corsOrigins;
  void server.register(cors, {
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true
  });

  void server.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024 // Telegram photo limit is 20 MB
    }
  });

  void server.register(fastifyStatic, {
    root: cfg.media.storageRoot,
    prefix: cfg.media.publicPath,
    decorateReply: false
  });

  server.get('/healthz', async () => ({ status: 'ok' }));

  server.setErrorHandler((error, request, reply) => {
    const appError = toAppError(error);
    const status = (() => {
      switch (appError.code) {
        case 'VALIDATION':
          return 400;
        case 'FORBIDDEN':
          return 403;
        case 'NOT_FOUND':
          return 404;
        case 'UNAUTHORIZED':
          return 401;
        case 'RATE_LIMIT':
          return 429;
        case 'DEPENDENCY':
          return 502;
        default:
          return 500;
      }
    })();
    reply.status(status).send({ error: appError.code, message: appError.message, details: appError.details });
  });

  void registerProfileRoutes(server);
  void registerListingRoutes(server);
  void registerMediaRoutes(server);

  return server;
};

export const startServer = async (deps: HttpServerDeps): Promise<AppFastifyInstance> => {
  const server = createServer(deps);
  const { host, port } = cfg.http;
  try {
    await server.listen({ port, host });
    log.info('[api] HTTP server listening', { port, host });
  } catch (error) {
    log.error('[api] Failed to start HTTP server', error);
    throw error;
  }
  return server;
};
