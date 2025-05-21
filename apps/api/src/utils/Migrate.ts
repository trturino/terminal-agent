import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../config/Database';

export async function runMigrations(): Promise<void> {
  const client = await db.getPool().connect();

  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Get all migration files
    const migrationsDir = path.join(__dirname, '../migrations');
    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter(file => file.endsWith('.sql'))
      .sort();
    // Get already executed migrations
    const executedMigrations = await client.query<{ name: string }>(
      'SELECT name FROM migrations ORDER BY name'
    );
    const executedMigrationNames = new Set(
      executedMigrations.rows.map((row: { name: string }) => row.name)
    );

    // Execute pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.has(file)) {
        console.log(`Running migration: ${file}`);

        const migrationSQL = await fs.readFile(
          path.join(migrationsDir, file),
          'utf-8'
        );

        await client.query('BEGIN');
        try {
          await client.query(migrationSQL);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Migration ${file} executed successfully`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error executing migration ${file}:`, error);
          throw error;
        }
      }
    }
  }
  catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
  finally {
    client.release();
  }
}
