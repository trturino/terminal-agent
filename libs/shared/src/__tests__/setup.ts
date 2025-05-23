import { mockClient } from 'aws-sdk-client-mock';
import { S3Client } from '@aws-sdk/client-s3';

// Create a mock S3 client
const s3ClientMock = mockClient(S3Client);

// Reset all mocks between tests
afterEach(() => {
  s3ClientMock.reset();
});

// Mock the getSignedUrl function
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://mock-signed-url.com'),
}));

export { s3ClientMock };
