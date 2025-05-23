import { IS3Service } from '../interfaces/IS3Service';
import { IPluginFileService } from '../interfaces/IPluginFileService';

export class PluginFileService implements IPluginFileService {
  private s3Service: IS3Service;
  private readonly pluginBucket: string;

  constructor(s3Service: IS3Service) {
    this.s3Service = s3Service;
    this.pluginBucket = s3Service.getBucketName();
  }

  /**
   * Get the S3 key prefix for a plugin's files
   */
  private getPluginPrefix(uuid: string): string {
    return `plugins/${uuid}/`;
  }

  /**
   * Get the S3 key for a plugin's zip file
   */
  private getPluginZipKey(uuid: string): string {
    return `${this.getPluginPrefix(uuid)}plugin.zip`;
  }

  /**
   * Upload a plugin zip file to S3
   */
  public async uploadPluginZip(uuid: string, fileBuffer: Buffer): Promise<void> {
    const key = this.getPluginZipKey(uuid);
    await this.s3Service.uploadFile(key, fileBuffer, 'application/zip');
  }

  /**
   * Delete all files for a plugin
   */
  public async deletePluginFiles(uuid: string): Promise<boolean> {
    const prefix = this.getPluginPrefix(uuid);
    return this.s3Service.deleteFolder(prefix);
  }

  /**
   * Get a presigned URL for downloading a plugin
   */
  public async getPluginDownloadUrl(uuid: string, expiresIn: number = 3600): Promise<string> {
    const key = this.getPluginZipKey(uuid);
    return this.s3Service.getPresignedUrl(key, expiresIn);
  }

  /**
   * Check if a plugin zip file exists
   */
  public async pluginZipExists(uuid: string): Promise<boolean> {
    try {
      const key = this.getPluginZipKey(uuid);
      await this.s3Service.getFileMetadata(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all plugin files for a given UUID
   */
  public async listPluginFiles(uuid: string): Promise<string[]> {
    const prefix = this.getPluginPrefix(uuid);
    return this.s3Service.listFiles(prefix);
  }
}
