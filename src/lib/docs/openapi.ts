import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { openApiSpec } from './openapi-spec';

export const openApiApp = new OpenAPIHono();

// Raw OpenAPI JSON spec endpoint
openApiApp.get('/doc', (c) => {
  return c.json(openApiSpec);
});

// Interactive Swagger UI endpoint
openApiApp.get('/ui', swaggerUI({ 
  url: '/api/v1/doc',
  title: 'AI Drive API Documentation',
  deepLinking: true,
  tryItOutEnabled: true,
}));

export default openApiApp;