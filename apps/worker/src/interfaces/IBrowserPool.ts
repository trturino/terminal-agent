import { Page } from 'playwright';

export interface IBrowserPool {
  getPage(): Promise<Page>;
  shutdown(): Promise<void>;
  getStats(): {
    inUse: number;
    totalContexts: number;
    waiters: number;
    jobsProcessed: number;
    shuttingDown: boolean;
  };
}

export interface BrowserPoolConfig {
  poolSize: number;
  maxContexts: number;
  chromiumArgs: string[];
  statsInterval: number;
  shutdownTimeout: number;
}
