import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { handleProcessUrl, handleGetFailedUrls, handleRetryUrl } from '../../controllers/url.controller';
import { CreateUrlSchema } from '../../lib/validation';
import { errorResponse } from '../../utils/response';

export const urlsRouter = new Hono();

// POST /api/urls
urlsRouter.post(
    '/',
    zValidator('json', CreateUrlSchema, (result, c) => {
        if (!result.success) {
            return c.json(
                errorResponse(result.error.issues.map((e) => e.message).join(', ')),
                400
            );
        }
    }),
    handleProcessUrl
);

// GET /api/urls/failed
urlsRouter.get('/failed', handleGetFailedUrls);

// POST /api/urls/retry/:id
urlsRouter.post('/retry/:id', handleRetryUrl);
