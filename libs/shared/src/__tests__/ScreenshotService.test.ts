import { S3Client } from '@aws-sdk/client-s3';
import { S3Service } from '../services/S3Service';
import { ScreenshotService } from '../services/ScreenshotService';
import { Readable } from 'stream';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

describe('ScreenshotService', () => {
  let s3Service: S3Service;
  let screenshotService: ScreenshotService;
  const mockS3Client = mockClient(S3Client);
  const testBucket = 'test-bucket';
  const testKey = 'test-screenshot.png';
  const testBuffer = Buffer.from('test image data');
  const testContentType = 'image/png';

  beforeEach(() => {
    mockS3Client.reset();
    s3Service = new S3Service({}, testBucket);
    screenshotService = new ScreenshotService(s3Service);
  });

  describe('uploadScreenshot', () => {
    it('should upload a screenshot to S3 with correct key and content type', async () => {
      mockS3Client.onAnyCommand().resolves({});
      
      const result = await screenshotService.uploadScreenshot(
        testBuffer,
        testKey,
        testContentType
      );

      expect(result).toBe(`screenshots/${testKey}`);
      expect(mockS3Client).toHaveReceivedCommandWith('PutObject', {
        Bucket: testBucket,
        Key: `screenshots/${testKey}`,
        Body: testBuffer,
        ContentType: testContentType,
      });
    });
  });

  describe('getScreenshotStream', () => {
    it('should return a readable stream for the screenshot', async () => {
      const mockStream = new Readable();
      mockS3Client.on(GetObjectCommand).resolves({
        Body: mockStream,
      });

      const result = await screenshotService.getScreenshotStream(testKey);
      expect(result).toBeInstanceOf(Readable);
      
      // Verify the correct S3 key was used
      expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: testBucket,
        Key: `screenshots/${testKey}`,
      });
    });
  });

  describe('getScreenshotBuffer', () => {
    it('should return the screenshot as a buffer', async () => {
      const mockStream = new Readable();
      mockStream.push(testBuffer);
      mockStream.push(null); // End of stream
      
      mockS3Client.on(GetObjectCommand).resolves({
        Body: mockStream,
      });

      const result = await screenshotService.getScreenshotBuffer(testKey);
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toEqual(testBuffer);
    });
  });

  describe('getScreenshotUrl', () => {
    it('should return a presigned URL for the screenshot', async () => {
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/screenshots/test-screenshot.png?X-Amz-Expires=3600';
      mockS3Client.on(GetObjectCommand).resolves({
        $metadata: { httpStatusCode: 200 },
      });
      
      // Mock the presigner
      jest.spyOn(require('@aws-sdk/s3-request-presigner'), 'getSignedUrl').mockResolvedValue(mockUrl);

      const url = await screenshotService.getScreenshotUrl(testKey, 3600);
      expect(url).toBe(mockUrl);
      expect(mockS3Client).toHaveReceivedCommandWith(GetObjectCommand, {
        Bucket: testBucket,
        Key: `screenshots/${testKey}`,
      });
    });
  });

  describe('deleteScreenshot', () => {
    it('should delete the screenshot from S3', async () => {
      mockS3Client.on(DeleteObjectCommand).resolves({});
      
      const result = await screenshotService.deleteScreenshot(testKey);
      expect(result).toBe(true);
      expect(mockS3Client).toHaveReceivedCommandWith(DeleteObjectCommand, {
        Bucket: testBucket,
        Key: `screenshots/${testKey}`,
      });
    });
  });

  describe('screenshotExists', () => {
    it('should return true if the screenshot exists', async () => {
      mockS3Client.on(HeadObjectCommand).resolves({
        ContentLength: 1024,
        ContentType: 'image/png',
        LastModified: new Date(),
        ETag: 'test-etag',
      });

      const exists = await screenshotService.screenshotExists(testKey);
      expect(exists).toBe(true);
    });

    it('should return false if the screenshot does not exist', async () => {
      const error = new Error('Not Found');
      error.name = 'NotFound';
      mockS3Client.on(HeadObjectCommand).rejects(error);

      const exists = await screenshotService.screenshotExists(testKey);
      expect(exists).toBe(false);
    });
  });

  describe('getScreenshotMetadata', () => {
    it('should return the screenshot metadata', async () => {
      const lastModified = new Date();
      const etag = 'test-etag';
      const contentLength = 1024;
      const contentType = 'image/png';
      
      mockS3Client.on(HeadObjectCommand).resolves({
        ContentLength: contentLength,
        ContentType: contentType,
        LastModified: lastModified,
        ETag: etag,
      });

      const metadata = await screenshotService.getScreenshotMetadata(testKey);
      
      expect(metadata).toEqual({
        size: contentLength,
        contentType,
        lastModified,
        etag,
      });
    });
  });
});
