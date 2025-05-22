import 'dotenv/config';
import { Worker } from './services/worker';
import { createLogger } from './utils/logger';

const logger = createLogger('worker:main');

async function start() {
  try {
    logger.info('Starting worker service...');
    
    // Initialize worker
    const worker = new Worker();

    // Handle shutdown gracefully
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await worker.stop();
        logger.info('Worker shutdown completed');
        process.exit(0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error during shutdown', { 
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
        });
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
    signals.forEach(signal => {
      process.on(signal, () => shutdown(signal));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });
      // Don't exit immediately, let the process complete current operations
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      // Don't exit immediately, let the process complete current operations
    });

    // Start processing messages
    await worker.start();
    
    logger.info('Worker service started successfully', {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to start worker service', { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

// Start the application
start().catch(error => {
  logger.error('Unexpected error in worker service', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
