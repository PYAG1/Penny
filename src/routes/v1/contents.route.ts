import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  handleProcessUrl,
  handleGetFailedUrls,
  handleRetryUrl,
  handleGetAllUrls,
} from '../../controllers/url.controller';
import { 
  handleUploadImages,
  handleGetAllImages,
} from '../../controllers/image.controller';
import { handleGetAllContents } from '../../controllers/content.controller';
import { CreateUrlSchema } from '../../lib/validation';
import { handleGetAllDocuments, handleUploadDocuments } from '@/controllers/document.controller';

export const contentsRouter = new Hono();

// General content routes
contentsRouter.get('/', handleGetAllContents); // GET /api/contents - Get all content types
contentsRouter.get('/failed', handleGetFailedUrls); // GET /api/contents/failed - Get failed content

// URL-specific routes
contentsRouter.post('/urls', zValidator('json', CreateUrlSchema), handleProcessUrl);
contentsRouter.get('/urls', handleGetAllUrls);
contentsRouter.post('/urls/retry/:id', handleRetryUrl);

// Image-specific routes
contentsRouter.post('/images', handleUploadImages);
contentsRouter.get('/images', handleGetAllImages);


contentsRouter.post('/docs', handleUploadDocuments);

// GET /api/contents/documents - Get all documents
contentsRouter.get('/docs', handleGetAllDocuments);