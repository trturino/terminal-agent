import { Readable } from 'stream';

export interface IScreenshotService {
  /**
   * Upload a screenshot to S3
   * @param buffer The image buffer to upload
   * @param key The S3 key to use (without the screenshots/ prefix)
   * @param contentType The content type of the image (e.g., 'image/png')
   * @returns The full S3 key where the screenshot was uploaded
   */
  uploadScreenshot(buffer: Buffer, key: string, contentType: string): Promise<string>;

  /**
   * Get a screenshot from S3 as a readable stream
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @returns A readable stream of the screenshot data
   */
  getScreenshotStream(key: string): Promise<Readable>;

  /**
   * Get a screenshot from S3 as a buffer
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @returns The screenshot as a buffer
   */
  getScreenshotBuffer(key: string): Promise<Buffer>;

  /**
   * Get a presigned URL for a screenshot
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @param expiresIn Time in seconds until the URL expires (default: 1 hour)
   * @returns A presigned URL to access the screenshot
   */
  getScreenshotUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete a screenshot from S3
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @returns True if the deletion was successful, false otherwise
   */
  deleteScreenshot(key: string): Promise<boolean>;

  /**
   * Check if a screenshot exists in S3
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @returns True if the screenshot exists, false otherwise
   */
  screenshotExists(key: string): Promise<boolean>;

  /**
   * Get metadata for a screenshot
   * @param key The S3 key of the screenshot (without the screenshots/ prefix)
   * @returns The screenshot metadata or null if not found
   */
  getScreenshotMetadata(key: string): Promise<{
    size: number;
    contentType: string;
    lastModified: Date;
    etag: string;
  } | null>;
}
