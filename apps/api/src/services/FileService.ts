import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, S3ClientConfig } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IFileService } from "../interfaces/IFileService";

export class FileService implements IFileService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(s3ClientConfig?: S3ClientConfig, bucketName?: string) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: true,
      ...s3ClientConfig
    });
    
    this.bucketName = bucketName || process.env.S3_BUCKET_NAME || 'terminal-agent';
  }

  public getS3Client(): S3Client {
    return this.s3Client;
  }

  /**
   * Get a presigned URL for a file in S3
   * @param deviceId The ID of the device
   * @param filename The name of the file
   * @param expiresIn URL expiration time in seconds (default: 1 hour)
   */
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
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        etag: response.ETag || ''
      };
    } catch (error) {
      if ((error as any).name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  public async getPresignedUrl(deviceId: string, filename: string, expiresIn: number = 3600): Promise<string> {
    const key = this.getS3Key(deviceId, filename);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw new Error('Failed to generate file URL');
    }
  }

  /**
   * Upload a file to S3 and return the filename
   * @param deviceId The ID of the device
   * @param file The file to upload
   * @param filename Optional custom filename (default: generated UUID)
   */
  public async uploadFile(deviceId: string, file: Buffer, filename?: string): Promise<string> {
    const finalFilename = filename || `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const key = this.getS3Key(deviceId, finalFilename);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
    });

    await this.s3Client.send(command);
    return finalFilename;
  }

  /**
   * Delete a file from S3
   * @param deviceId The ID of the device
   * @param filename The name of the file to delete
   */
  public async deleteFile(deviceId: string, filename: string): Promise<void> {
    const key = this.getS3Key(deviceId, filename);
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private getS3Key(deviceId: string, filename: string): string {
    return `${deviceId}/${filename}`;
  }
}
