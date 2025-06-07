import { Pool, PoolConfig } from 'pg';

export class Database {
  private static instance: Database;
  private pool: Pool;

  private constructor() {
    const config: PoolConfig = {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'terminal_agent',
      password: process.env.DB_PASSWORD || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };

    this.pool = new Pool(config);

    // Test the connection
    this.pool.query('SELECT NOW()')
      .then(() => console.log('Database connected successfully'))
      .catch((err: Error) => console.error('Database connection error', err));
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export const db = Database.getInstance();

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}
