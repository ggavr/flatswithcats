import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
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
    logger: false,
    connectionTimeout: 60_000, // 60 seconds for long-lived connections
    keepAliveTimeout: 65_000, // Slightly higher than connectionTimeout
    requestTimeout: 30_000, // 30 seconds per request
    bodyLimit: 20 * 1024 * 1024 // 20 MB max request body
  });
  const server = rawServer as unknown as AppFastifyInstance;

  server.decorate('telegram', telegram);

  const corsOrigins = cfg.http.corsOrigins;
  void server.register(cors, {
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
    exposedHeaders: ['x-auth-token']
  });

  // Rate limiting: 100 requests per minute per IP/token
  void server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000, // Keep track of 10k IPs/tokens
    allowList: ['127.0.0.1', '::1'], // Allow localhost for health checks
    keyGenerator: (request) => {
      // Rate limit by auth token if available, otherwise by IP
      const authToken = request.headers['x-auth-token'] || request.headers.authorization;
      if (typeof authToken === 'string' && authToken.length > 0) {
        return `token:${authToken.slice(0, 32)}`; // Use first 32 chars as key
      }
      return `ip:${request.ip}`;
    },
    errorResponseBuilder: () => ({
      error: 'RATE_LIMIT',
      message: 'Слишком много запросов. Попробуй через минуту.',
      statusCode: 429
    }),
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    }
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

  server.get('/', async () => ({ name: 'Cats & Flats API', status: 'ok' }));

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
