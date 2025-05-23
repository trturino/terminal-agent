import { JobProcessor } from '../services/job-processor';
import { JobPayload } from '../types/job';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current module's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('JobProcessor', () => {
  let jobProcessor: JobProcessor;
  const testAssetsDir = path.join(__dirname, '../../test-assets');
  const outputDir = path.join(__dirname, '../../test-output');

  beforeAll(async () => {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    // Initialize job processor with test configuration
    jobProcessor = new JobProcessor();
    await jobProcessor.initialize();
  });

  afterAll(async () => {
    // Clean up resources
    await jobProcessor.cleanup();
  });

  it('should process a job with RGB565 color scheme', async () => {
    const jobPayload: JobPayload = {
      id: 'test-rgb565',
      tmpZipPath: path.join(testAssetsDir, 'test-template.zip'),
      deviceProfile: {
        width: 800,
        height: 480,
        format: 'bmp',
      },
      colorScheme: {
        type: 'rgb565',
      },
    };

    const result = await jobProcessor.processJob(jobPayload);
    
    expect(result).toBeDefined();
    expect(result.imageKey).toContain('generated/');
    expect(result.metadata.format).toBe('bmp');
    expect(result.metadata.width).toBe(800);
    expect(result.metadata.height).toBe(480);
  });

  it('should process a job with RGBA8888 color scheme', async () => {
    const jobPayload: JobPayload = {
      id: 'test-rgba8888',
      tmpZipPath: path.join(testAssetsDir, 'test-template.zip'),
      deviceProfile: {
        width: 800,
        height: 480,
        format: 'png',
      },
      colorScheme: {
        type: 'rgba8888',
      },
    };

    const result = await jobProcessor.processJob(jobPayload);
    
    expect(result).toBeDefined();
    expect(result.imageKey).toContain('generated/');
    expect(result.metadata.format).toBe('png');
  });

  it('should process a job with indexed8 color scheme', async () => {
    const jobPayload: JobPayload = {
      id: 'test-indexed8',
      tmpZipPath: path.join(testAssetsDir, 'test-template.zip'),
      deviceProfile: {
        width: 800,
        height: 480,
        format: 'png',
      },
      colorScheme: {
        type: 'indexed8',
        palette: ['#FF0000', '#00FF00', '#0000FF'],
      },
    };

    const result = await jobProcessor.processJob(jobPayload);
    
    expect(result).toBeDefined();
    expect(result.imageKey).toContain('generated/');
    expect(result.metadata.format).toBe('png');
  });

  it('should process a job with grayscale color scheme', async () => {
    const jobPayload: JobPayload = {
      id: 'test-grayscale',
      tmpZipPath: path.join(testAssetsDir, 'test-template.zip'),
      deviceProfile: {
        width: 800,
        height: 480,
        format: 'png',
      },
      colorScheme: {
        type: 'grayscale',
      },
    };

    const result = await jobProcessor.processJob(jobPayload);
    
    expect(result).toBeDefined();
    expect(result.imageKey).toContain('generated/');
    expect(result.metadata.format).toBe('png');
  });
});
