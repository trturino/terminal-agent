import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import * as unzipper from 'unzipper'; // Using namespace import for types
import { Liquid } from 'liquidjs';
import sharp from 'sharp';
import { Page } from 'playwright';
import { JobPayload, ProcessedJobResult } from '../types/job';
import { logger } from '../utils/logger';
import { IScreenshotService } from '../interfaces/IScreenshotService';
import { IBrowserPool } from '../interfaces/IBrowserPool';

const loggerWithContext = logger.child({ module: 'job-processor' });

export class JobProcessor {
  private jobsProcessed: number = 0;

  constructor(
    private readonly screenshotService: IScreenshotService,
    private readonly browserPool: IBrowserPool,
    private readonly liquidEngine: Liquid = new Liquid({
      strictFilters: true,
      strictVariables: true,
    })
  ) {}

  /**
   * Clean up resources when the processor is no longer needed
   */
  async cleanup(): Promise<void> {
    // BrowserPool manages its own cleanup
  }

  async processJob(payload: JobPayload): Promise<ProcessedJobResult> {
    // 1. Create a temporary directory for extraction
    const tempDir = `/tmp/${payload.id}`;
    let page: Page | null = null;
    
    try {
      await mkdir(tempDir, { recursive: true });
      
      // 2. Get a page from the browser pool
      page = await this.browserPool.getPage();
      if (!page) {
        throw new Error('Failed to get a browser page from the pool');
      }
      
      // 3. Extract the ZIP file
      await this.extractZip(payload.tmpZipPath, tempDir);

      // 4. Render Liquid template
      const html = await this.renderLiquidTemplate(join(tempDir, 'index.liquid'), {});

      // 5. Take screenshot with Playwright
      const screenshot = await this.takeScreenshot(page, html, payload.deviceProfile);

      // 6. Process the image with Sharp
      const processedImage = await this.processImage(
        screenshot,
        payload.deviceProfile,
        payload.colorScheme
      );

      // 7. Upload to S3 bucket using ScreenshotService
      const imageKey = await this.screenshotService.uploadScreenshot(
        processedImage,
        `generated/${Date.now()}_${payload.id}.${payload.deviceProfile.format}`,
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
        { error, jobId: payload.id },
        'Error processing job'
      );
      throw error;
    } finally {
      // Cleanup resources - page will be automatically closed by the browser pool
      if (page) {
        await page.close().catch(() => {});
      }
      await rm(tempDir, { recursive: true, force: true }).catch(() => {});
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
      await page.setContent(html, { waitUntil: 'networkidle' });
      await page.setViewportSize({
        width: deviceProfile.width,
        height: deviceProfile.height,
      });

      // Add a small delay to ensure rendering is complete
      await page.waitForTimeout(100);

      return await page.screenshot({
        type: 'png', // Always capture as PNG first, we'll convert later if needed
        fullPage: false,
        animations: 'disabled',
      });
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
