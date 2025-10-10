import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

import pdfRoutes from './routes/pdf.js';
import questionsRoutes from './routes/questions.js';
import rolesRoutes from './routes/roles.js';
import healthRoutes from './routes/health.js';

async function buildServer() {
  const fastify = Fastify({
    logger: logger,
    trustProxy: true
  });

  try {
    await fastify.register(cors, {
      origin: env.NODE_ENV === 'production' ? false : true,
      credentials: true
    });

    await fastify.register(multipart, {
      limits: {
        fileSize: env.MAX_FILE_SIZE
      }
    });

    fastify.setErrorHandler(async (error, _request, reply) => {
      fastify.log.error(error);

      if (error.validation) {
        return reply.code(400).send({
          success: false,
          error: 'Validation error',
          details: error.validation
        });
      }

      if (error.statusCode) {
        return reply.code(error.statusCode).send({
          success: false,
          error: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: env.NODE_ENV === 'production' ? 'Internal server error' : error.message
      });
    });

    fastify.setNotFoundHandler(async (_request, reply) => {
      return reply.code(404).send({
        success: false,
        error: 'Endpoint not found'
      });
    });

    await fastify.register(healthRoutes, { prefix: '/api/health' });
    await fastify.register(rolesRoutes, { prefix: '/api/roles' });
    await fastify.register(pdfRoutes, { prefix: '/api/pdf' });
    await fastify.register(questionsRoutes, { prefix: '/api/questions' });

    fastify.get('/', async (_request, reply) => {
      return reply.send({
        message: 'Restaurant Evaluation API',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          roles: '/api/roles',
          pdf_upload: '/api/pdf/upload',
          generate_questions: '/api/questions/generate'
        }
      });
    });

    return fastify;

  } catch (error) {
    logger.error('Failed to build server:', error);
    throw error;
  }
}

async function start() {
  try {
    const server = await buildServer();

    const address = await server.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    logger.info(`Server listening on ${address}`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Max file size: ${env.MAX_FILE_SIZE} bytes`);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildServer };