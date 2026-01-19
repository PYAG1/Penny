import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { handleUploadImages } from '../../controllers/image.controller';
import { CreateImageSchema } from '../../lib/validation';
import { errorResponse } from '../../utils/response';

export const imagesRouter = new Hono();

// POST /api/images
imagesRouter.post(
    '/',
    zValidator('form', CreateImageSchema, (result, c) => {
        if (!result.success) {
            return c.json(
                errorResponse(result.error.issues.map((e) => e.message).join(', ')),
                400
            );
        }
    }),
    handleUploadImages
);
