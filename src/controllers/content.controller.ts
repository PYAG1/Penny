import { Context } from 'hono';
import { contentRepository } from '../repositories';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';

/**
 * Get all content (images, URLs, YouTube videos)
 * GET /api/contents
 */
export const handleGetAllContents = async (c: Context) => {
  try {
    const allContent = await contentRepository.findAll();

    return c.json(
      successResponse({
        total: allContent.length,
        contents: allContent.map((item) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          status: item.status,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
      })
    );
  } catch (error: unknown) {
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
};