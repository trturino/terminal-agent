import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { FileService } from '../../../src/services/FileService';

// Mock the AWS SDK
const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend
    })),
    GetObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      command: 'GetObjectCommand'
    })),
    PutObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      command: 'PutObjectCommand'
    })),
    DeleteObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      command: 'DeleteObjectCommand'
    })),
    HeadObjectCommand: jest.fn().mockImplementation((params) => ({
      ...params,
      command: 'HeadObjectCommand'
    }))
  };
});

// Mock the s3-request-presigner
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn((...args) => mockGetSignedUrl(...args))
}));

describe('FileService', () => {
  let fileService: FileService;
  let mockS3Client: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock implementation for each test
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    
    // Default mock implementation for send
    mockSend.mockImplementation((command) => {
      if (command.command === 'HeadObjectCommand') {
        return Promise.resolve({
          ContentLength: 1024,
          ContentType: 'image/jpeg',
          LastModified: new Date(),
          ETag: '\"test-etag\"',
        });
      }
      return Promise.resolve({});
    });
    
    // Default mock implementation for getSignedUrl
    mockGetSignedUrl.mockResolvedValue('https://example.com/presigned-url');
    
    // Create a mock S3 client
    mockS3Client = {
      send: mockSend
    };
    
    // Create a new instance for each test with the mock client
    fileService = new FileService(mockS3Client, 'test-bucket');
  });

  describe('constructor', () => {
    it('should create a new instance with provided S3 client and bucket name', () => {
      expect(fileService).toBeDefined();
      expect(fileService).toBeInstanceOf(FileService);
      expect(mockS3Client.send).toBeDefined();
    });
  });

  describe('getPresignedUrl', () => {
    it('should generate a presigned URL for a file', async () => {
      const deviceId = 'test-device';
      const filename = 'test-file.jpg';
      const expectedKey = `${deviceId}/${filename}`;
      const mockPresignedUrl = 'https://example.com/presigned-url';
      
      // Mock the getSignedUrl function to return our test URL
      mockGetSignedUrl.mockResolvedValueOnce(mockPresignedUrl);
      
      const result = await fileService.getPresignedUrl(deviceId, filename);
      
      expect(result).toBe(mockPresignedUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(S3Client),
        expect.objectContaining({
          Bucket: 'test-bucket',
          Key: expectedKey
        }),
        { expiresIn: 3600 }
      );
      
      // Verify the command was created with correct parameters
      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expectedKey,
      });
    });

    it('should throw an error if generating URL fails', async () => {
      const error = new Error('Failed to generate URL');
      mockGetSignedUrl.mockRejectedValueOnce(error);
      
      await expect(fileService.getPresignedUrl('test-device', 'test-file.jpg'))
        .rejects
        .toThrow('Failed to generate file URL');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file from S3', async () => {
      const deviceId = 'test-device';
      const filename = 'test-file.jpg';
      const expectedKey = `${deviceId}/${filename}`;
      
      // Mock the delete operation to succeed
      mockSend.mockResolvedValueOnce({});
      
      await fileService.deleteFile(deviceId, filename);
      
      // Verify the command was created with correct parameters
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expectedKey,
      });
      
      // Verify the command was sent
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should throw an error if deletion fails', async () => {
      const deviceId = 'test-device';
      const filename = 'test-file.jpg';
      const error = new Error('S3 error');
      
      // Mock the delete operation to fail
      mockSend.mockRejectedValueOnce(error);
      
      await expect(fileService.deleteFile(deviceId, filename))
        .rejects
        .toThrow('S3 error');
    });
  });

  describe('uploadFile', () => {
    it('should upload a file to S3', async () => {
      const deviceId = 'test-device';
      const fileContent = Buffer.from('test content');
      const filename = 'test-file.jpg';
      const expectedKey = `${deviceId}/${filename}`;
      
      // Mock the upload operation to succeed
      mockSend.mockResolvedValueOnce({});
      
      const result = await fileService.uploadFile(deviceId, fileContent, filename);
      
      expect(result).toBe(filename);
      
      // Verify the command was created with correct parameters
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expectedKey,
        Body: fileContent,
      });
      
      // Verify the command was sent
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should generate a filename if not provided', async () => {
      const deviceId = 'test-device';
      const fileContent = Buffer.from('test content');
      
      // Mock the upload operation to succeed
      mockSend.mockResolvedValueOnce({});
      
      const result = await fileService.uploadFile(deviceId, fileContent);
      
      // Should match format: timestamp-randomstring.bmp
      expect(result).toMatch(/^\d+-[a-z0-9]+\.bmp$/);
      
      // Verify the command was created with correct parameters
      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expect.stringContaining(deviceId),
        Body: fileContent,
      });
      
      // Verify the command was sent
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should throw an error if upload fails', async () => {
      const deviceId = 'test-device';
      const fileContent = Buffer.from('test content');
      const filename = 'test-file.jpg';
      const error = new Error('Upload failed');
      
      // Mock the upload operation to fail
      mockSend.mockRejectedValueOnce(error);
      
      await expect(fileService.uploadFile(deviceId, fileContent, filename))
        .rejects
        .toThrow('Upload failed');
    });
  });

  describe('getFileMetadata', () => {
    it('should return file metadata', async () => {
      const deviceId = 'test-device';
      const filename = 'test-file.jpg';
      const expectedKey = `${deviceId}/${filename}`;
      const mockMetadata = {
        ContentLength: 1024,
        ContentType: 'image/jpeg',
        LastModified: new Date(),
        ETag: '\"test-etag\"',
      };
      
      // Mock the send method to return metadata
      mockSend.mockResolvedValueOnce(mockMetadata);
      
      const result = await fileService.getFileMetadata(deviceId, filename);
      
      expect(result).toEqual({
        size: mockMetadata.ContentLength,
        contentType: mockMetadata.ContentType,
        lastModified: mockMetadata.LastModified,
        etag: mockMetadata.ETag,
      });
      
      // Verify the command was created with correct parameters
      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: expectedKey,
      });
      
      // Verify send was called with the command
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object));
    });
    
    it('should return null if file does not exist', async () => {
      const deviceId = 'test-device';
      const filename = 'non-existent.jpg';
      const error = new Error('Not Found');
      (error as any).name = 'NotFound';
      
      // Mock the send method to reject with a not found error
      mockSend.mockRejectedValueOnce(error);
      
      const result = await fileService.getFileMetadata(deviceId, filename);
      
      expect(result).toBeNull();
    });
  });
});
