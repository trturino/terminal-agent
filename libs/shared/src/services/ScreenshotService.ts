import { Readable } from 'stream';
import { IScreenshotService } from '../interfaces/IScreenshotService';
import { IS3Service } from '../interfaces/IS3Service';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export class ScreenshotService implements IScreenshotService {
  private readonly SCREENSHOTS_PREFIX = 'screenshots/';

  constructor(private s3Service: IS3Service) {}

  private getFullKey(key: string): string {
    // Ensure the key doesn't already have the screenshots/ prefix to avoid duplication
    if (key.startsWith(this.SCREENSHOTS_PREFIX)) {
      return key;
    }
    return `${this.SCREENSHOTS_PREFIX}${key}`;
  }

  async uploadScreenshot(buffer: Buffer, key: string, contentType: string): Promise<string> {
    const fullKey = this.getFullKey(key);
    await this.s3Service.uploadFile(fullKey, buffer, contentType);
    return fullKey;
  }

  async getScreenshotStream(key: string): Promise<Readable> {
    const fullKey = this.getFullKey(key);
    const command = new GetObjectCommand({
      Bucket: this.s3Service.getBucketName(),
      Key: fullKey,
    });

    const response = await this.s3Service.getS3Client().send(command);
    if (!response.Body) {
      throw new Error(`No body in response for key: ${key}`);
    }

    return response.Body as Readable;
  }

  async getScreenshotBuffer(key: string): Promise<Buffer> {
    const stream = await this.getScreenshotStream(key);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async getScreenshotUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const fullKey = this.getFullKey(key);
    return this.s3Service.getPresignedUrl(fullKey, expiresIn);
  }

  async deleteScreenshot(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    return this.s3Service.deleteFile(fullKey);
  }

  async screenshotExists(key: string): Promise<boolean> {
    const fullKey = this.getFullKey(key);
    try {
      const metadata = await this.s3Service.getFileMetadata(fullKey);
      return metadata !== null;
    } catch (error) {
      return false;
    }
  }

  async getScreenshotMetadata(key: string) {
    const fullKey = this.getFullKey(key);
    return this.s3Service.getFileMetadata(fullKey);
  }
}
