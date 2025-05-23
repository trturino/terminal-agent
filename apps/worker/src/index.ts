import 'dotenv/config';
import { Worker } from './services/worker';
import { logger } from './utils/logger';

const loggerWithContext = logger.child({ module: 'worker:main' });

async function start() {
  try {
    loggerWithContext.info('Starting worker service...');
    
    // Initialize worker
    const worker = new Worker();

    // Handle shutdown gracefully
    const shutdown = async (signal: string) => {
      loggerWithContext.info(`Received ${signal}, shutting down gracefully...`);
      
      try {
        await worker.stop();
        loggerWithContext.info('Worker shutdown completed');
        process.exit(0);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        loggerWithContext.error(
          { 
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          },
          'Error during shutdown'
        );
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
      loggerWithContext.error(
        { 
          error: error.message,
          stack: error.stack,
        },
        'Uncaught exception'
      );
      // Don't exit immediately, let the process complete current operations
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      const reasonMessage = reason instanceof Error ? reason.message : String(reason);
      loggerWithContext.error(
        { 
          reason: reasonMessage,
          stack: reason instanceof Error ? reason.stack : undefined,
          promise: String(promise)
        },
        'Unhandled rejection'
      );
      // Don't exit immediately, let the process complete current operations
    });

    // Start the worker
    await worker.start();

    loggerWithContext.info('Worker service started successfully', {
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    loggerWithContext.error(
      { 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to start worker service'
    );
    process.exit(1);
  }
}

// Start the application
start().catch(error => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  loggerWithContext.error(
    { 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    },
    'Unexpected error in worker service'
  );
  process.exit(1);
});
