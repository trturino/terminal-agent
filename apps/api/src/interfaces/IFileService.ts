import { S3Client } from "@aws-sdk/client-s3";

export interface IFileService {
  getPresignedUrl(deviceId: string, filename: string, expiresIn?: number): Promise<string>;
  deleteFile(deviceId: string, filename: string): Promise<void>;
  getFileMetadata(deviceId: string, filename: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null>;
  uploadFile(deviceId: string, file: Buffer, filename?: string): Promise<string>;
  getS3Client(): S3Client;
}
