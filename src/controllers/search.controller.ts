import { Hono } from 'hono';
import { generateEmbedding } from '../lib/ai/embeddings';
import { contentRepository } from '../repositories';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';

const searchController = new Hono();

/**
 * GET /api/search
 * Semantic search across images and content
 *
 * Query params:
 * - q: Search query (required)
 * - type: Filter by type (image, webpage, youtube, all) - default: all
 * - limit: Max results (default: 20)
 */
searchController.get('/', async (c) => {
  try {
    const query = c.req.query('q');
    const type = (c.req.query('type') || 'all') as 'image' | 'webpage' | 'youtube' | 'all';
    const limit = parseInt(c.req.query('limit') || '20', 10);

    if (!query) {
      return c.json(errorResponse('Query parameter "q" is required'), 400);
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Search contents using vector similarity
    const results = await contentRepository.searchByEmbedding(queryEmbedding, {
      limit,
      threshold: 0.3,
      type,
    });

    return c.json(
      successResponse({
        query,
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
});

/**
 * GET /api/search/recent
 * Get recently added content
 */
searchController.get('/recent', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20', 10);

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
});

export { searchController };
