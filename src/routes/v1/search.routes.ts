import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { handleSearch, handleGetRecent } from '../../controllers/search.controller';
import { SearchQuerySchema, RecentContentSchema } from '../../lib/validation';
import { errorResponse } from '../../utils/response';

export const searchRouter = new Hono();

// GET /api/search
searchRouter.get(
    '/',
    zValidator('query', SearchQuerySchema, (result, c) => {
        if (!result.success) {
            return c.json(
                errorResponse(result.error.issues.map((e) => e.message).join(', ')),
                400
            );
        }
    }),
    handleSearch
);

// GET /api/search/recent
searchRouter.get(
    '/recent',
    zValidator('query', RecentContentSchema, (result, c) => {
        if (!result.success) {
            return c.json(
                errorResponse(result.error.issues.map((e) => e.message).join(', ')),
                400
            );
        }
    }),
    handleGetRecent
);
