import { Plugin } from "../models/Plugin.js";
import { IPluginFileService } from "@terminal-agent/shared";
import { v4 as uuidv4 } from 'uuid';
import { db, QueryResult } from '../config/Database.js';

export class PluginService {
  private pluginFileService: IPluginFileService;

  constructor(pluginFileService: IPluginFileService) {
    this.pluginFileService = pluginFileService;
  }

  /**
   * Create a new plugin with the provided zip file
   */
  /**
   * Create a new plugin
   */
  public async createPlugin(
    name: string,
    version: string,
    description?: string | null,
    author?: string | null,
    enabled: boolean = true
  ): Promise<Plugin> {
    // Convert empty strings to null for description and author
    const desc = description?.trim() || null;
    const auth = author?.trim() || null;

    const query = `
      INSERT INTO plugins (uuid, name, version, description, author, enabled)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      uuidv4(),
      name,
      version,
      desc,
      auth,
      enabled
    ];

    const result = await db.getPool().query<Plugin>(query, values);
    return result.rows[0];
  }

  /**
   * Get a plugin by ID
   */
  public async getPlugin(id: number): Promise<Plugin | null> {
    return this.findById(id);
  }

  /**
   * Find a plugin by ID
   */
  public async findById(id: number): Promise<Plugin | null> {
    const query = 'SELECT * FROM plugins WHERE id = $1';
    const result = await db.getPool().query<Plugin>(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get a plugin by UUID
   */
  public async getPluginByUuid(uuid: string): Promise<Plugin | null> {
    return this.findByUuid(uuid);
  }

  /**
   * Find a plugin by UUID
   */
  public async findByUuid(uuid: string): Promise<Plugin | null> {
    const query = 'SELECT * FROM plugins WHERE uuid = $1';
    const result = await db.getPool().query<Plugin>(query, [uuid]);
    return result.rows[0] || null;
  }

  /**
   * Find all plugins
   */
  public async findAll(): Promise<Plugin[]> {
    const query = 'SELECT * FROM plugins ORDER BY created_at DESC';
    const result = await db.getPool().query<Plugin>(query);
    return result.rows;
  }

  /**
   * List plugins with pagination
   * @param skip Number of plugins to skip (for pagination)
   * @param limit Maximum number of plugins to return
   */
  public async listPlugins(skip: number = 0, limit: number = 10): Promise<{ plugins: Plugin[]; total: number }> {
    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM plugins';
    const countResult = await db.getPool().query<{ count: string }>(countQuery);
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const query = 'SELECT * FROM plugins ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    const result = await db.getPool().query<Plugin>(query, [limit, skip]);
    
    return {
      plugins: result.rows,
      total
    };
  }

  /**
   * Update a plugin
   */
  /**
   * Update a plugin
   */
  public async updatePlugin(
    id: number,
    updates: {
      name?: string;
      version?: string;
      description?: string | null;
      author?: string | null;
      enabled?: boolean;
    }
  ): Promise<Plugin | null> {
    // Convert null to undefined for description and author to match the database model
    const updateData = { ...updates };
    if ('description' in updateData && updateData.description === null) {
      updateData.description = undefined;
    }
    if ('author' in updateData && updateData.author === null) {
      updateData.author = undefined;
    }
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updated_at = NOW()');
    
    const query = `
      UPDATE plugins
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    values.push(id);
    
    const result = await db.getPool().query<Plugin>(query, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a plugin and its associated files
   */
  /**
   * Delete a plugin by ID
   */
  public async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM plugins WHERE id = $1';
    const result = await db.getPool().query(query, [id]);
    return result.rowCount ? result.rowCount > 0 : false;
  }

  /**
   * Delete a plugin and its associated files
   */
  public async deletePlugin(id: number): Promise<boolean> {
    const plugin = await this.findById(id);
    if (!plugin) return false;

    // Delete the plugin files using PluginFileService
    await this.pluginFileService.deletePluginFiles(plugin.uuid);

    // Delete the database entry
    return this.delete(id);
  }

  /**
   * Check if a plugin zip exists
   */
  public async pluginZipExists(uuid: string): Promise<boolean> {
    return this.pluginFileService.pluginZipExists(uuid);
  }

  /**
   * Upload a plugin zip file for a specific plugin ID
   */
  public async uploadPluginFile(id: number, fileBuffer: Buffer): Promise<void> {
    const plugin = await this.findById(id);
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    await this.pluginFileService.uploadPluginZip(plugin.uuid, fileBuffer);
  }

  /**
   * Upload a plugin zip file for a specific UUID
   */
  public async uploadPluginZip(uuid: string, fileBuffer: Buffer): Promise<void> {
    await this.pluginFileService.uploadPluginZip(uuid, fileBuffer);
  }

  /**
   * Get a presigned URL for downloading a plugin
   */
  public async getPluginDownloadUrl(uuid: string, expiresIn: number = 3600): Promise<string> {
    return this.pluginFileService.getPluginDownloadUrl(uuid, expiresIn);
  }
}
