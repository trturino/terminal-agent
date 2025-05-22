import { Plugin, PluginModel } from "../models/Plugin";
import { S3Service } from "./S3Service";
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/Database';

export class PluginService {
  private s3Service: S3Service;
  private readonly pluginBucket: string;

  constructor(s3Service: S3Service) {
    this.s3Service = s3Service;
    this.pluginBucket = s3Service.getBucketName();
  }

  /**
   * Create a new plugin with the provided zip file
   */
  public async createPlugin(
    name: string,
    version: string,
    description?: string | null,
    author?: string | null,
    enabled: boolean = true
  ): Promise<Plugin> {
    // First create the plugin in the database
    // Convert empty strings to null for description and author
    const desc = description?.trim() || null;
    const auth = author?.trim() || null;

    return await PluginModel.create({
      name,
      version,
      description: desc,
      author: auth,
      enabled
    });
  }

  /**
   * Get a plugin by ID
   */
  public async getPlugin(id: number): Promise<Plugin | null> {
    return PluginModel.findById(id);
  }

  /**
   * Get a plugin by UUID
   */
  public async getPluginByUuid(uuid: string): Promise<Plugin | null> {
    return PluginModel.findByUuid(uuid);
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
    return PluginModel.update(id, updateData);
  }

  /**
   * Delete a plugin and its associated files
   */
  public async deletePlugin(id: number): Promise<boolean> {
    const plugin = await PluginModel.findById(id);
    if (!plugin) return false;

    // Delete the plugin files from S3
    const prefix = this.getPluginPrefix(plugin.uuid);
    await this.s3Service.deleteFolder(prefix);

    // Delete the database entry
    return PluginModel.delete(id);
  }

  /**
   * Get the download URL for a plugin
   */
  public async getPluginDownloadUrl(uuid: string, expiresIn: number = 3600): Promise<string> {
    const key = this.getPluginZipKey(uuid);
    return this.s3Service.getPresignedUrl(key, expiresIn);
  }

  /**
   * Get the S3 key for a plugin's zip file
   */
  private getPluginZipKey(uuid: string): string {
    return `${this.pluginBucket}/${uuid}/plugin.zip`;
  }

  /**
   * Get the S3 prefix for all files of a plugin
   */
  private getPluginPrefix(uuid: string): string {
    return `${this.pluginBucket}/${uuid}/`;
  }

  /**
   * Upload or update a plugin file
   * @param id Plugin ID
   * @param fileBuffer The file buffer to upload
   */
  public async uploadPluginFile(id: number, fileBuffer: Buffer): Promise<void> {
    const plugin = await this.getPlugin(id);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    // Upload the new file
    const key = this.getPluginZipKey(plugin.uuid);
    await this.s3Service.uploadFile(key, fileBuffer, 'application/zip');

    // Update the plugin's updated_at timestamp
    await PluginModel.update(id, {});
  }
}
