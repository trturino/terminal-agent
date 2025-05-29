import { IFileService } from "../interfaces/IFileService.js";
import { IS3Service } from "../interfaces/IS3Service.js";

export class FileService implements IFileService {
  private s3Service: IS3Service;

  constructor(s3Service: IS3Service) {
    this.s3Service = s3Service;
  }


  /**
   * Get file metadata including size and content type
   */
  public async getFileMetadata(deviceId: string, filename: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null> {
    const key = this.getS3Key(deviceId, filename);
    return this.s3Service.getFileMetadata(key);
  }

  /**
   * Get a presigned URL for a file in S3
   * @param deviceId The ID of the device
   * @param filename The name of the file
   * @param expiresIn URL expiration time in seconds (default: 1 hour)
   */
  public async getPresignedUrl(deviceId: string, filename: string, expiresIn: number = 3600): Promise<string> {
    const key = this.getS3Key(deviceId, filename);
    return this.s3Service.getPresignedUrl(key, expiresIn);
  }

  /**
   * Upload a file to S3
   * @param deviceId The ID of the device
   * @param file The file content as a Buffer
   * @param filename Optional custom filename (will generate one if not provided)
   * @returns The filename used to store the file
   */
  public async uploadFile(deviceId: string, file: Buffer, filename?: string): Promise<string> {
    const finalFilename = filename || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const key = this.getS3Key(deviceId, finalFilename);
    
    await this.s3Service.uploadFile(key, file, 'application/octet-stream');
    return finalFilename;
  }

  /**
   * Delete a file from S3
   * @param deviceId The ID of the device
   * @param filename The name of the file to delete
   */
  public async deleteFile(deviceId: string, filename: string): Promise<void> {
    const key = this.getS3Key(deviceId, filename);
    await this.s3Service.deleteFile(key);
  }

  private getS3Key(deviceId: string, filename: string): string {
    return `devices/${deviceId}/${filename}`;
  }
}
