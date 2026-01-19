import { Context } from 'hono';
import { generateEmbedding } from '../lib/ai/embeddings';
import { contentRepository } from '../repositories';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';
import { SearchQueryInput } from '../lib/validation';

/**
 * Handle search
 * GET /api/search
 */
export const handleSearch = async (c: Context) => {
  try {
    // Validated by zValidator in route
    const { q, type, limit } = (c as any).req.valid('query') as SearchQueryInput;

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(q);

    // Search contents using vector similarity
    const results = await contentRepository.searchByEmbedding(queryEmbedding, {
      limit: limit || 20,
      threshold: 0.3,
      type,
    });

    return c.json(
      successResponse({
        query: q,
        total: results.length,
        results: results.map((r) => ({
          id: r.id,
          type: r.type,
          url: r.url,
          title: r.title,
          description: r.description,
          imageUrl: r.imageUrl,
          similarity: r.similarity,
          matchedChunk: r.matchedChunk,
          matchedSection: r.matchedSection,
          metadata: r.metadata,
          createdAt: r.createdAt,
        })),
      })
    );
  } catch (error: unknown) {
    console.error('[Search] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
};

/**
 * Get recently added content
 * GET /api/search/recent
 */
export const handleGetRecent = async (c: Context) => {
  try {
    // We can assume limit is validated if we add validation to this route too
    const { limit } = (c as any).req.valid('query') as { limit: number };

    const contents = await contentRepository.findRecent(limit);

    return c.json(
      successResponse({
        total: contents.length,
        results: contents.map((c) => ({
          id: c.id,
          type: c.type,
          url: c.url,
          title: c.title,
          description: c.description,
          imageUrl: c.imageUrl,
          metadata: c.metadata,
          createdAt: c.createdAt,
        })),
      })
    );
  } catch (error: unknown) {
    console.error('[Recent] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
};
