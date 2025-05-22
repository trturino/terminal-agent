import { S3Client } from "@aws-sdk/client-s3";

export interface IS3Service {
  getS3Client(): S3Client;
  getBucketName(): string;
  
  getFileMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null>;

  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
  uploadFile(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteFile(key: string): Promise<boolean>;
  listFiles(prefix: string): Promise<string[]>;
  deleteFolder(prefix: string): Promise<boolean>;
}
