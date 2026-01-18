import { Hono } from 'hono';
import { contentService } from '../services/content.service';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';

const imageController = new Hono();

/**
 * POST /api/images
 * Upload and process images/screenshots
 */
imageController.post('/', async (c) => {
  try {
    // Extract request data
    const formData = await c.req.formData();
    const context = formData.get('context') as string | undefined;

    const files: Array<{ buffer: Buffer; filename: string; contentType: string }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        const file = value as File;
        const arrayBuffer = await file.arrayBuffer();
        files.push({
          buffer: Buffer.from(arrayBuffer),
          filename: file.name,
          contentType: file.type || 'image/png',
        });
      }
    }

    if (files.length === 0) {
      return c.json(errorResponse('No images provided'), 400);
    }

    // Delegate to service layer
    const results = await Promise.all(
      files.map((file) =>
        contentService.processImage({
          buffer: file.buffer,
          filename: file.filename,
          contentType: file.contentType,
          context,
        })
      )
    );

    // Format response
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return c.json(
      successResponse({
        processed: files.length,
        successful: successful.length,
        failed: failed.length,
        results,
      })
    );
  } catch (error: unknown) {
    console.error('[Images] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

export { imageController };
