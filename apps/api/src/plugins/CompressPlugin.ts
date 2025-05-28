// src/plugins/CompressPlugin.ts
import { FastifyPluginAsync } from 'fastify';
import compress from '@fastify/compress';
import { constants as zlibConstants } from 'zlib';

export class CompressPlugin {
  /**
   * Registers @fastify/compress to automatically
   * gzip/deflate/brotli compress responses.
   */
  public static plugin: FastifyPluginAsync = async (fastify) => {
    await fastify.register(compress, {
      // compress all routes by default
      global: true,
      // only compress responses larger than 1kB
      threshold: 1024,
      // enable common encodings
      encodings: ['gzip', 'deflate', 'br'],
      // for brotli, you can tweak quality if desired
      brotliOptions: {
        // the compression quality from 0 to 11 (default 4)
        params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 4 },
      },
      // inflate responses if they come pre-compressed
      inflateIfDeflated: true,
    });
  };
}