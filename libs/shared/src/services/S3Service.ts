import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { IS3Service } from "../interfaces/IS3Service.js";
import logger from "./logger.js";
import { Readable } from "stream";

export class S3Service implements IS3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(S3Client: S3Client, bucketName: string) {
    this.s3Client = S3Client;
    this.bucketName = bucketName;
  }

  public getS3Client(): S3Client {
    return this.s3Client;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public async getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null> {
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
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  public async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  public async downloadFile(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    if (!response.Body) {
      throw new Error('Failed to download file from S3');
    }
    return response.Body as Readable;
  }

  public async uploadFile(key: string, body: Buffer, contentType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ContentType: contentType
    });

    await this.s3Client.send(command);
  }

  public async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      logger.error('Error deleting file from S3:', error);
      return false;
    }
  }

  public async listFiles(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);
    if (!response.Contents) return [];

    return response.Contents
      .map(item => item.Key)
      .filter((key): key is string => key !== undefined);
  }

  public async deleteFolder(prefix: string): Promise<boolean> {
    try {
      const files = await this.listFiles(prefix);

      if (files.length > 0) {
        const deleteParams = {
          Bucket: this.bucketName,
          Delete: {
            Objects: files.map(key => ({ Key: key })),
            Quiet: false
          }
        };

        await this.s3Client.send(new DeleteObjectsCommand(deleteParams));
      }

      return true;
    } catch (error) {
      logger.error('Error deleting folder from S3:', error);
      return false;
    }
  }
}
