import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Create and export mock S3 client
const s3ClientMock = mockClient(S3Client);

// Export commands and mock client for use in tests
export {
  s3ClientMock,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
};

// Reset all mocks between tests
afterEach(() => {
  s3ClientMock.reset();
});

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com'),
}));
