import { Context } from 'hono';
import { contentService } from '../services/content.service';
import { contentRepository } from '../repositories';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';
import { CreateUrlInput } from '../lib/validation';

/**
 * Handle new URL processing
 * POST /api/urls
 */
export const handleProcessUrl = async (c: Context) => {
  try {
    // We assume validation has already passed in the route
    const { url, userNote } = await c.req.json() as CreateUrlInput;

    const result = await contentService.processUrl({ url, userNote });

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
};

/**
 * Get all failed content items
 * GET /api/urls/failed
 */
export const handleGetFailedUrls = async (c: Context) => {
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
};

/**
 * Retry a failed content item
 * POST /api/urls/retry/:id
 */
export const handleRetryUrl = async (c: Context) => {
  try {
    const id = c.req.param('id');

    const result = await contentService.retryFailedContent(id);

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
};
