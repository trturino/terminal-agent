import { mkdir, rm, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as unzipper from 'unzipper'; // Using namespace import for types
import { Liquid } from 'liquidjs';
import sharp from 'sharp';
import { Page } from 'playwright';
import { ScreenshotQueueJob, ProcessedScreenshotResult } from '@terminal-agent/shared';
import { logger } from '../utils/logger.js';
import { IScreenshotService } from '../interfaces/IScreenshotService.js';
import { IBrowserPool } from '../interfaces/IBrowserPool.js';
import { IPluginFileService } from '@terminal-agent/shared';
import { createWriteStream } from 'fs';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const loggerWithContext = logger.child({ module: 'job-processor' });

export class JobProcessor {
  private jobsProcessed: number = 0;

  private template: string | null = null;

  constructor(
    private readonly screenshotService: IScreenshotService,
    private readonly browserPool: IBrowserPool,
    private readonly pluginFileService: IPluginFileService,
    private readonly liquidEngine: Liquid = new Liquid({
      strictFilters: true,
      strictVariables: true,
    })
  ) {
    this.loadTemplate();
  }

  private async loadTemplate(): Promise<void> {
    try {
      const templatePath = join(__dirname, '../templates/plugin-wrapper.html');
      this.template = await readFile(templatePath, 'utf-8');
    } catch (error) {
      loggerWithContext.error({ error }, 'Failed to load HTML template');
      throw new Error('Failed to load HTML template');
    }
  }

  /**
   * Clean up resources when the processor is no longer needed
   */
  async cleanup(): Promise<void> {
    // BrowserPool manages its own cleanup
  }

  async processJob(jobId: string, payload: ScreenshotQueueJob): Promise<ProcessedScreenshotResult> {
    // 1. Create a temporary directory for extraction
    const tempDirPath = os.tmpdir();
    const tempDir = `${tempDirPath}/${jobId}`;
    let page: Page | null = null;

    try {
      await mkdir(tempDir, { recursive: true });

      // 2. Get a page from the browser pool
      page = await this.browserPool.getPage();
      if (!page) {
        throw new Error('Failed to get a browser page from the pool');
      }

      // 3. Download the plugin zip file
      const zipFile = await this.pluginFileService.downloadPluginZip(payload.pluginUuid);
      const zipPath = join(tempDir, 'plugin.zip');
      const writeStream = createWriteStream(zipPath);
      await new Promise((resolve, reject) => {
        zipFile.pipe(writeStream)
          .on('finish', resolve as () => void)
          .on('error', reject);
      });

      // 4. Extract the ZIP file
      const pluginDir = `${tempDir}/plugin`;
      await this.extractZip(zipPath, pluginDir);

      // 5. Render Liquid template
      const liquidHtml = await this.renderLiquidTemplate(join(pluginDir, 'index.liquid'), {});
      
      // 6. Wrap the rendered content in the HTML template
      if (!this.template) {
        await this.loadTemplate();
      }
      const finalHtml = this.template!.replace('{{content}}', liquidHtml);

      // 7. Take screenshot with Playwright
      const screenshot = await this.takeScreenshot(page, finalHtml, payload.deviceProfile);

      // 8. Process the image with Sharp
      const processedImage = await this.processImage(
        screenshot,
        payload.deviceProfile,
        payload.colorScheme
      );

      // 9. Upload to S3 bucket using ScreenshotService
      const imageKey = await this.screenshotService.uploadScreenshot(
        processedImage,
        `generated/${Date.now()}_${jobId}.${payload.deviceProfile.format}`,
        `image/${payload.deviceProfile.format}`
      );

      return {
        imageKey,
        metadata: {
          width: payload.deviceProfile.width,
          height: payload.deviceProfile.height,
          format: payload.deviceProfile.format,
          size: processedImage.length,
        },
      };
    } catch (error) {
      loggerWithContext.error(
        { error, jobId },
        'Error processing job'
      );
      throw error;
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => { });
    }
  }

  private async extractZip(zipPath: string, targetDir: string): Promise<void> {
    try {
      // Using type assertion since the types are not properly exported
      const zip = await unzipper.Open.file(zipPath) as any;
      await zip.extract({ path: targetDir });
    } catch (error) {
      loggerWithContext.error({ error, zipPath }, 'Error extracting ZIP file');
      throw new Error(`Failed to extract ZIP file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async renderLiquidTemplate(
    templatePath: string,
    context: Record<string, any>
  ): Promise<string> {
    try {
      return await this.liquidEngine.renderFile(templatePath, context);
    } catch (error) {
      loggerWithContext.error({ error, templatePath }, 'Error rendering Liquid template');
      throw new Error(`Failed to render Liquid template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async takeScreenshot(
    page: Page,
    html: string,
    deviceProfile: { width: number; height: number }
  ): Promise<Buffer> {
    try {
      // Set up error handling for page errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        loggerWithContext.error({ error: error.message }, 'Page error occurred');
        errors.push(error.message);
      });

      // Set up request failed handler
      page.on('requestfailed', (request) => {
        loggerWithContext.warn(
          { 
            url: request.url(),
            failure: request.failure()?.errorText,
            resourceType: request.resourceType()
          },
          'Request failed'
        );
      });

      // Set viewport size first
      await page.setViewportSize({
        width: deviceProfile.width,
        height: deviceProfile.height,
      });

      // Set content with error handling and increased timeout
      await page.setContent(html, { 
        waitUntil: 'networkidle',
        timeout: 60000 // 60 seconds
      });

      // Wait for any lazy-loaded content
      await page.waitForLoadState('networkidle');
      
      // Wait a bit more for any JavaScript to finish executing
      await page.waitForTimeout(1000);

      // Log any errors that occurred during page load
      if (errors.length > 0) {
        loggerWithContext.warn({ errors }, 'Page loaded with errors');
      }

      // Take the screenshot
      const screenshot = await page.screenshot({
        type: 'png', // Always capture as PNG first, we'll convert later if needed
        fullPage: false,
        animations: 'disabled',
        timeout: 30000 // 30 seconds
      });
      
      return screenshot;
    } catch (error) {
      loggerWithContext.error({ error }, 'Error taking screenshot');
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async processImage(
    pngBuffer: Buffer,
    deviceProfile: { width: number; height: number; format: 'bmp' | 'png' | 'jpeg' },
    colorScheme?: { type: string; palette?: string[] }
  ): Promise<Buffer> {
    try {
      const format = deviceProfile.format;
      const colorType = colorScheme?.type || (format === 'bmp' ? 'rgb565' : 'rgba8888');

      let output: Buffer;

      switch (colorType) {
        case 'rgb565':
          output = await sharp(pngBuffer)
            .raw()
            .toColourspace('rgb16')
            .toBuffer();
          break;

        case 'indexed8':
          output = await sharp(pngBuffer)
            .png({ palette: true, colours: colorScheme?.palette?.length || 256 })
            .toBuffer();
          break;

        case 'grayscale':
          output = await sharp(pngBuffer)
            .grayscale()
            .png()
            .toBuffer();
          break;

        case 'rgba8888':
        default:
          output = pngBuffer; // Keep original PNG (32 bit)
          break;
      }


      return output;
    } catch (error) {
      loggerWithContext.error({ error }, 'Error processing image');
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
