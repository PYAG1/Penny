import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  handleSearch,
  handleGetRecent,
} from '../../controllers/search.controller';
import { SearchQuerySchema, RecentContentSchema } from '../../lib/validation';

export const searchRouter = new Hono();

// GET /api/search - Semantic search
searchRouter.get('/', zValidator('query', SearchQuerySchema), handleSearch);

// GET /api/search/recent - Get recent content
searchRouter.get('/recent', zValidator('query', RecentContentSchema), handleGetRecent);
