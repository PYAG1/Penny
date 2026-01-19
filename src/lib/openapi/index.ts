import { OpenAPIHono } from '@hono/zod-openapi';

export function createOpenAPIApp() {
  return new OpenAPIHono();
}