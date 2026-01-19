import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { imagesRouter } from './routes/v1/images.routes';
import { urlsRouter } from './routes/v1/urls.routes';
import { searchRouter } from './routes/v1/search.routes';
import docsApp from './lib/openapi/docs';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    service: 'AI Drive Search API',
    version: '1.0.0',
  });
});

// Mount routes
app.route('/api/images', imagesRouter);
app.route('/api/urls', urlsRouter);
app.route('/api/search', searchRouter);

// Mount documentation
app.route('/docs', docsApp);

export default app;
