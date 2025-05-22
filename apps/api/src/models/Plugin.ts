import { v4 as uuidv4 } from 'uuid';
import { db, QueryResult } from '../config/Database';
import { Timestamped } from './BaseModel';

export interface Plugin extends Timestamped {
  id: number;
  uuid: string;
  name: string;
  version: string;
  description: string | null;
  author: string | null;
  enabled: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class PluginModel {
  private static readonly TABLE_NAME = 'plugins';

  static async create(plugin: Omit<Plugin, 'id' | 'uuid' | 'created_at' | 'updated_at'>): Promise<Plugin> {
    const query = `
      INSERT INTO ${this.TABLE_NAME} (uuid, name, version, description, author, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      uuidv4(),
      plugin.name,
      plugin.version,
      plugin.description || null,
      plugin.author || null,
      plugin.enabled !== undefined ? plugin.enabled : true
    ];

    const result = await db.getPool().query<Plugin>(query, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Plugin | null> {
    const query = `SELECT * FROM ${this.TABLE_NAME} WHERE id = $1`;
    const result = await db.getPool().query<Plugin>(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUuid(uuid: string): Promise<Plugin | null> {
    const query = `SELECT * FROM ${this.TABLE_NAME} WHERE uuid = $1`;
    const result = await db.getPool().query<Plugin>(query, [uuid]);
    return result.rows[0] || null;
  }

  static async findAll(): Promise<Plugin[]> {
    const query = `SELECT * FROM ${this.TABLE_NAME} ORDER BY created_at DESC`;
    const result = await db.getPool().query<Plugin>(query);
    return result.rows;
  }

  static async update(
    id: number, 
    updates: Partial<Omit<Plugin, 'id' | 'uuid' | 'created_at' | 'updated_at'>> & {
      description?: string | null;
      author?: string | null;
    }
  ): Promise<Plugin | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = NOW()`);
    
    const query = `
      UPDATE ${this.TABLE_NAME}
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await db.getPool().query<Plugin>(query, values);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const query = `DELETE FROM ${this.TABLE_NAME} WHERE id = $1`;
    const result = await db.getPool().query(query, [id]);
    const success = result.rowCount ? result.rowCount > 0 : false;
    return success;
  }
}

// Create the plugins table if it doesn't exist
export async function initPluginTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS plugins (
      id SERIAL PRIMARY KEY,
      uuid UUID NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      version VARCHAR(50) NOT NULL,
      description TEXT,
      author VARCHAR(255),
      enabled BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      UNIQUE(name, version)
    );
  `;
  
  await db.getPool().query(query);
}
