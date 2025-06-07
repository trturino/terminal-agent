import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { logger } from '../utils/logger.js';
import { IBrowserPool, BrowserPoolConfig } from '../interfaces/IBrowserPool.js';

const loggerWithContext = logger.child({ module: 'browser-pool' });

export class BrowserPool implements IBrowserPool {
  private browser: Browser | null = null;
  private inUse = 0;
  private totalContexts = 0;
  private jobsProcessed = 0;
  private shuttingDown = false;
  private readonly waiters: Array<() => void> = [];
  private activePages = new Set<Page>();
  
  private readonly config: BrowserPoolConfig;

  constructor(config: BrowserPoolConfig) {
    this.config = config;
    this.setupShutdownHandlers();
    this.setupStatsLogging();
  }

  private async launchBrowser(): Promise<Browser> {
    loggerWithContext.info({ args: this.config.chromiumArgs }, 'Launching new browser instance');
    const browser = await chromium.launch({ args: this.config.chromiumArgs });
    
    // Handle browser close event
    browser.on('disconnected', () => {
      loggerWithContext.info('Browser instance disconnected');
      this.browser = null;
      this.totalContexts = 0;
    });
    
    return browser;
  }

  private async restartBrowser(): Promise<void> {
    if (!this.browser) return;
    
    const oldBrowser = this.browser;
    this.browser = null;
    this.totalContexts = 0;
    this.jobsProcessed = 0;
    
    try {
      // Close all active pages
      const closePromises = Array.from(this.activePages).map(page => page.close().catch(() => {}));
      await Promise.all(closePromises);
      this.activePages.clear();
      
      // Close the browser
      await oldBrowser.close();
      loggerWithContext.info('Browser instance closed and reset');
    } catch (error) {
      loggerWithContext.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Error closing browser'
      );
      throw error;
    }
  }

  private waitForSlot(): Promise<void> {
    if (this.inUse < this.config.poolSize) {
      return Promise.resolve();
    }
    
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private notifyWaiters(): void {
    while (this.waiters.length > 0 && this.inUse < this.config.poolSize) {
      const resolve = this.waiters.shift();
      if (resolve) resolve();
    }
  }

  public async getPage(): Promise<Page> {
    if (this.shuttingDown) {
      throw new Error('Cannot get page: browser pool is shutting down');
    }

    // Check if we need to recycle the browser
    if (this.jobsProcessed >= this.config.maxContexts) {
      loggerWithContext.info('Max jobs reached, recycling browser');
      await this.restartBrowser();
    }

    if (!this.browser) {
      try {
        this.browser = await this.launchBrowser();
      } catch (error) {
        loggerWithContext.error(
          { error: error instanceof Error ? error.message : String(error) },
          'Failed to launch browser'
        );
        throw error;
      }
    }

    await this.waitForSlot();
    
    try {
      this.inUse++;
      this.jobsProcessed++;
      this.totalContexts++;
      
      if (!this.browser) {
        throw new Error('Browser instance is not available');
      }
      
      const context = await this.browser.newContext();
      const page = await context.newPage();
      this.activePages.add(page);
      
      // Handle page close event
      page.on('close', () => {
        this.inUse--;
        this.activePages.delete(page);
        this.notifyWaiters();
        
        loggerWithContext.debug({
          inUse: this.inUse,
          totalContexts: this.totalContexts,
          waiters: this.waiters.length
        }, 'Page closed');
      });
      
      loggerWithContext.debug({
        inUse: this.inUse,
        totalContexts: this.totalContexts,
        waiters: this.waiters.length,
        jobsProcessed: this.jobsProcessed
      }, 'Page created');
      
      return page;
    } catch (error) {
      this.inUse--;
      this.notifyWaiters();
      
      loggerWithContext.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to create browser page'
      );
      
      if (this.browser) {
        await this.restartBrowser();
      }
      
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    
    this.shuttingDown = true;
    loggerWithContext.info('Shutting down browser pool');
    
    if (!this.browser) {
      return;
    }
    
    // Wait for in-use contexts to be released or timeout
    const startTime = Date.now();
    
    while (this.inUse > 0 && Date.now() - startTime < this.config.shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.inUse > 0) {
      loggerWithContext.warn(`Timeout waiting for ${this.inUse} contexts to be released`);
    }
    
    try {
      await this.browser.close();
      loggerWithContext.info('Browser pool shutting down');
    } catch (error) {
      loggerWithContext.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Error closing browser during shutdown'
      );
      throw error;
    } finally {
      this.browser = null;
    }
  }

  private setupShutdownHandlers(): void {
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.on(signal, async () => {
        loggerWithContext.info({
          signal,
          inUse: this.inUse,
          totalContexts: this.totalContexts
        }, `Received ${signal}, shutting down browser pool`);
        
        try {
          await this.shutdown();
          process.exit(0);
        } catch (error) {
          process.exit(1);
        }
      });
    }
  }

  public getStats() {
    return {
      inUse: this.inUse,
      totalContexts: this.totalContexts,
      waiters: this.waiters.length,
      jobsProcessed: this.jobsProcessed,
      shuttingDown: this.shuttingDown
    };
  }

  private setupStatsLogging(): void {
    // Log pool stats periodically
    setInterval(() => {
      loggerWithContext.debug({
        inUse: this.inUse,
        totalContexts: this.totalContexts,
        waiters: this.waiters.length,
        shuttingDown: this.shuttingDown
      }, 'Browser pool stats');
    }, this.config.statsInterval).unref();
  }
}
