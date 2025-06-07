import { Readable } from 'stream';

export interface IScreenshotService {
  uploadScreenshot(buffer: Buffer, key: string, contentType: string): Promise<string>;
  getScreenshotStream(key: string): Promise<Readable>;
  getScreenshotBuffer(key: string): Promise<Buffer>;
  getScreenshotUrl(key: string, expiresIn?: number): Promise<string>;
  deleteScreenshot(key: string): Promise<boolean>;
  screenshotExists(key: string): Promise<boolean>;
  getScreenshotMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null>;
}
