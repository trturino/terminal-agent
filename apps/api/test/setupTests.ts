// Mock environment variables
process.env.NODE_ENV = 'test';

// Mock database connection
const mockQuery = jest.fn();
const mockGetPool = jest.fn(() => ({
  query: mockQuery,
}));

jest.mock('../src/config/database', () => ({
  db: {
    getPool: mockGetPool,
  },
  __esModule: true,
  mockQuery,
  mockGetPool,
}));

// Mock FileService
const mockFileService = {
  getInstance: jest.fn().mockReturnThis(),
  getPresignedUrl: jest.fn().mockResolvedValue('https://example.com/presigned-url'),
  deleteFile: jest.fn().mockResolvedValue(true),
};

jest.mock('../src/services/FileService', () => ({
  FileService: jest.fn().mockImplementation(() => mockFileService),
  __esModule: true,
}));

// Mock Fastify
const mockFastify = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  register: jest.fn(),
  listen: jest.fn(),
  ready: jest.fn().mockImplementation((cb) => cb()),
  close: jest.fn(),
  inject: jest.fn(),
  log: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
};

jest.mock('fastify', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => mockFastify),
}));

// Export mocks for testing
export { mockQuery, mockGetPool, mockFileService, mockFastify };
