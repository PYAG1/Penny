import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { imageController, urlController, searchController } from './controllers';

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

// Mount controllers
app.route('/api/images', imageController);
app.route('/api/urls', urlController);
app.route('/api/search', searchController);

export default app;
