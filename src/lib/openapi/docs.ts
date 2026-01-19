import { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';

// Create OpenAPI app for documentation
const app = new OpenAPIHono();

// Basic OpenAPI spec
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'AI Drive API',
    description: 'AI-powered drive for intelligent knowledge management',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    { name: 'Images', description: 'Image upload and processing' },
    { name: 'URLs', description: 'URL and content processing' },
    { name: 'Search', description: 'Semantic search and content retrieval' },
    { name: 'Health', description: 'Health check and monitoring' },
  ],
});

// Swagger UI route
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

export default app;