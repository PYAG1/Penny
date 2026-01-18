import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { contentService } from '../services/content.service';
import { contentRepository } from '../repositories';
import { createUrlContentSchema } from '../lib/validation';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';

const urlController = new Hono();

/**
 * POST /api/urls
 * Process a URL (webpage or YouTube video)
 */
urlController.post(
  '/',
  zValidator('json', createUrlContentSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        errorResponse(result.error.issues.map((e) => e.message).join(', ')),
        400
      );
    }
  }),
  async (c) => {
    try {
      // Extract request data
      const { url, userNote } = c.req.valid('json');

      // Delegate to service layer
      const result = await contentService.processUrl({ url, userNote });

      // Format response
      return c.json(
        successResponse({
          content: {
            id: result.contentId,
            type: result.type,
            title: result.title,
            description: result.description,
            url: result.url,
            imageUrl: result.imageUrl,
          },
          chunksCreated: result.chunksCreated,
        })
      );
    } catch (error: unknown) {
      return c.json(errorResponse(getSafeErrorMessage(error)), 500);
    }
  }
);

/**
 * GET /api/urls/failed
 * Get all failed content items
 */
urlController.get('/failed', async (c) => {
  try {
    const failedContents = await contentRepository.findFailed();

    return c.json(
      successResponse({
        contents: failedContents.map((item) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          title: item.title,
          errorMessage: item.errorMessage,
          createdAt: item.createdAt,
          processingAttempts: item.processingAttempts,
        })),
      })
    );
  } catch (error: unknown) {
    console.error('[Failed] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

/**
 * POST /api/urls/retry/:id
 * Retry a failed content item
 */
urlController.post('/retry/:id', async (c) => {
  try {
    // Extract request data
    const { id } = c.req.param();

    // Delegate to service layer
    const result = await contentService.retryFailedContent(id);

    // Format response
    return c.json(successResponse({ contentId: id, chunksCreated: result.chunksCreated }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : getSafeErrorMessage(error);

    if (errorMessage === 'Content not found') {
      return c.json(errorResponse(errorMessage), 404);
    }

    if (
      errorMessage === 'Content is not in failed state' ||
      errorMessage === 'Image content requires re-upload to retry'
    ) {
      return c.json(errorResponse(errorMessage), 400);
    }

    console.error('[Retry] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

export { urlController };
