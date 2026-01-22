export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AI Drive API',
    version: '1.0.0',
    description: 'AI-powered drive for intelligent knowledge management. Upload, process, and search various types of content including images, URLs, notes, and documents using AI-powered semantic search.',
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Bearer token for authentication',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'better-auth.session_token',
        description: 'Session token for authentication',
      },
    },
    schemas: {
      // Success Response Schema
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { description: 'Response data' },
          message: { type: 'string', description: 'Optional message' },
        },
        required: ['success'],
      },
      
      // Error Response Schema
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', description: 'Error message' },
          message: { type: 'string', description: 'Additional context' },
        },
        required: ['success', 'error'],
      },

      // Content Schemas
      Content: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Content unique identifier' },
          type: {
            type: 'string',
            enum: ['image', 'webpage', 'youtube', 'document'],
            description: 'Type of content'
          },
          url: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'Source URL if applicable'
          },
          fileUrl: {
            type: 'string',
            format: 'uri',
            nullable: true,
            description: 'File storage URL for uploaded documents'
          },
          title: { type: 'string', description: 'Content title' },
          description: { 
            type: 'string', 
            nullable: true,
            description: 'Content description'
          },
          imageUrl: { 
            type: 'string', 
            format: 'uri', 
            nullable: true,
            description: 'Associated image URL'
          },
          metadata: { 
            type: 'object',
            description: 'Additional metadata for the content'
          },
          createdAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Last update timestamp'
          },
        },
        required: ['id', 'type', 'title', 'createdAt', 'updatedAt'],
      },

      // Search Result Schema
      SearchResult: {
        allOf: [
          { $ref: '#/components/schemas/Content' },
          {
            type: 'object',
            properties: {
              similarity: { 
                type: 'number', 
                description: 'Similarity score (0-1)',
                example: 0.85
              },
              matchedChunk: { 
                type: 'string', 
                description: 'Text snippet that matched the query',
                example: 'Relevant text snippet from the content'
              },
              matchedSection: { 
                type: 'string', 
                description: 'Section containing the match',
                example: 'Introduction'
              },
            },
          },
        ],
      },

      // Failed Content Schema
      FailedContent: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Content unique identifier' },
          type: {
            type: 'string',
            enum: ['image', 'webpage', 'youtube', 'document'],
            description: 'Type of content'
          },
          url: { 
            type: 'string', 
            format: 'uri', 
            nullable: true,
            description: 'Source URL if applicable'
          },
          title: { type: 'string', description: 'Content title' },
          errorMessage: { 
            type: 'string', 
            nullable: true,
            description: 'Error message from failed processing'
          },
          createdAt: { 
            type: 'string', 
            format: 'date-time',
            description: 'Creation timestamp'
          },
          processingAttempts: { 
            type: 'integer',
            description: 'Number of retry attempts',
            example: 3
          },
        },
        required: ['id', 'type', 'title', 'createdAt', 'processingAttempts'],
      },

      // Request Schemas
      PaginationQuery: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number for pagination',
            example: 1,
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Number of items per page',
            example: 20,
          },
        },
      },

      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'array',
            description: 'Array of items',
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', description: 'Current page number' },
              limit: { type: 'integer', description: 'Items per page' },
              total: { type: 'integer', description: 'Total number of items' },
              totalPages: { type: 'integer', description: 'Total number of pages' },
            },
            required: ['page', 'limit', 'total', 'totalPages'],
          },
        },
        required: ['success', 'data', 'pagination'],
      },

      CreateImageRequest: {
        type: 'object',
        properties: {
          image: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
            description: 'Image files to upload',
          },
          context: {
            type: 'string',
            description: 'Optional context for image analysis',
            example: 'Product screenshot for catalog',
          },
        },
        required: ['image'],
      },

      CreateUrlRequest: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri',
            description: 'URL to process (webpage or YouTube)',
            example: 'https://example.com/article',
          },
          userNote: {
            type: 'string',
            description: 'Optional user note about the content',
            example: 'Important article about AI trends',
          },
        },
        required: ['url'],
      },

      SearchRequest: {
        type: 'object',
        properties: {
          q: {
            type: 'string',
            description: 'Search query for semantic search',
            example: 'artificial intelligence',
          },
          type: {
            type: 'string',
            enum: ['image', 'webpage', 'youtube', 'document', 'all'],
            description: 'Filter by content type',
            example: 'all',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20,
            description: 'Maximum number of results to return',
            example: 20,
          },
        },
        required: ['q'],
      },

      RetryRequest: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Content ID to retry processing',
            example: 'abc-123-def',
          },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'Health check and monitoring endpoints' },
    { name: 'Content', description: 'Content management including images and URLs' },
    { name: 'Search', description: 'Semantic search and content retrieval' },
  ],
  paths: {
    // Health Check
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Basic health check to verify service is running',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'AI Drive Search API' },
                    version: { type: 'string', example: '1.0.0' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // Content - Images
    '/api/content/images': {
      post: {
        tags: ['Content'],
        summary: 'Upload and process images',
        description: 'Upload one or more images for AI analysis and semantic search indexing',
        security: [],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: { $ref: '#/components/schemas/CreateImageRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Images processed successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            processed: { type: 'integer', example: 2 },
                            successful: { type: 'integer', example: 2 },
                            failed: { type: 'integer', example: 0 },
                            results: {
                              type: 'array',
                              items: { type: 'object' },
                              description: 'Processing results for each image',
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad request - validation error or no images provided',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Content'],
        summary: 'Get all images',
        description: 'Retrieve all uploaded images with pagination',
        security: [],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
            example: 1,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'Images retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Content' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        totalPages: { type: 'integer', description: 'Total number of pages' },
                      },
                      required: ['page', 'limit', 'total', 'totalPages'],
                    },
                  },
                  required: ['success', 'data', 'pagination'],
                },
              },
            },
          },
        },
      },
    },

    // Content - URLs
    '/api/content/urls': {
      post: {
        tags: ['Content'],
        summary: 'Process URL content',
        description: 'Extract and analyze content from a URL (webpage or YouTube video)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUrlRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'URL processed successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            content: { $ref: '#/components/schemas/Content' },
                            chunksCreated: { type: 'integer', example: 5 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad request - invalid URL or processing error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Content'],
        summary: 'Get all URLs',
        description: 'Retrieve all processed URLs with pagination',
        security: [],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
            example: 1,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'URLs retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Content' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        totalPages: { type: 'integer', description: 'Total number of pages' },
                      },
                      required: ['page', 'limit', 'total', 'totalPages'],
                    },
                  },
                  required: ['success', 'data', 'pagination'],
                },
              },
            },
          },
        },
      },
    },

    // Content - Documents
    '/api/content/docs': {
      post: {
        tags: ['Content'],
        summary: 'Upload PDF documents',
        description: 'Upload one or more PDF documents for AI analysis and semantic search indexing. Maximum 3 files per request, 20MB per file.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'PDF file to upload',
                  },
                  file2: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional second PDF file',
                  },
                  file3: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional third PDF file',
                  },
                  context: {
                    type: 'string',
                    description: 'Optional context for document analysis',
                    example: 'Meeting notes from Q4 planning session',
                  },
                },
                required: ['file'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Documents processed successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            processed: { type: 'integer', example: 2 },
                            successful: { type: 'integer', example: 2 },
                            failed: { type: 'integer', example: 0 },
                            totalPages: { type: 'integer', example: 15 },
                            results: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  success: { type: 'boolean' },
                                  contentId: { type: 'string' },
                                  title: { type: 'string' },
                                  pageCount: { type: 'integer' },
                                  chunksCreated: { type: 'integer' },
                                  error: { type: 'string' },
                                },
                              },
                              description: 'Processing results for each document',
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad request - validation error, no PDFs provided, file too large, or too many files',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Content'],
        summary: 'Get all documents',
        description: 'Retrieve all uploaded PDF documents',
        security: [],
        responses: {
          200: {
            description: 'Documents retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 5 },
                            contents: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  id: { type: 'string' },
                                  type: { type: 'string', example: 'document' },
                                  title: { type: 'string' },
                                  description: { type: 'string' },
                                  fileUrl: { type: 'string', format: 'uri' },
                                  status: { type: 'string' },
                                  metadata: {
                                    type: 'object',
                                    properties: {
                                      pageCount: { type: 'integer' },
                                      mimeType: { type: 'string' },
                                      originalFilename: { type: 'string' },
                                      tags: { type: 'array', items: { type: 'string' } },
                                    },
                                  },
                                  createdAt: { type: 'string', format: 'date-time' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          500: {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // Content - General
    '/api/content': {
      get: {
        tags: ['Content'],
        summary: 'Get all content',
        description: 'Retrieve all content types (images, URLs, etc.) with pagination',
        security: [],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
            example: 1,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'Content retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Content' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        totalPages: { type: 'integer', description: 'Total number of pages' },
                      },
                      required: ['page', 'limit', 'total', 'totalPages'],
                    },
                  },
                  required: ['success', 'data', 'pagination'],
                },
              },
            },
          },
        },
      },
    },

    '/api/content/failed': {
      get: {
        tags: ['Content'],
        summary: 'Get failed content items',
        description: 'Retrieve all content items that failed processing with pagination',
        security: [],
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number for pagination',
            example: 1,
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Number of items per page',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'Failed content items retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/FailedContent' },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'integer', description: 'Current page number' },
                        limit: { type: 'integer', description: 'Items per page' },
                        total: { type: 'integer', description: 'Total number of items' },
                        totalPages: { type: 'integer', description: 'Total number of pages' },
                      },
                      required: ['page', 'limit', 'total', 'totalPages'],
                    },
                  },
                  required: ['success', 'data', 'pagination'],
                },
              },
            },
          },
        },
      },
    },

    '/api/content/urls/retry/{id}': {
      post: {
        tags: ['Content'],
        summary: 'Retry failed content',
        description: 'Retry processing a failed content item',
        security: [],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Content ID to retry',
          },
        ],
        responses: {
          200: {
            description: 'Content retry initiated successfully',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            contentId: { type: 'string', example: 'abc-123-def' },
                            chunksCreated: { type: 'integer', example: 5 },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          404: {
            description: 'Content not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          400: {
            description: 'Content is not in failed state',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    // Search
    '/api/search': {
      get: {
        tags: ['Search'],
        summary: 'Semantic search',
        description: 'Search content using AI-powered semantic similarity',
        security: [],
        parameters: [
          {
            name: 'q',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Search query for semantic search',
            example: 'artificial intelligence',
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['image', 'webpage', 'youtube', 'document', 'all']
            },
            description: 'Filter by content type',
            example: 'all',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { 
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            description: 'Maximum number of results to return',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'Search results',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            query: { type: 'string', example: 'artificial intelligence' },
                            total: { type: 'integer', example: 10 },
                            results: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/SearchResult' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: {
            description: 'Bad request - missing query parameter',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },

    '/api/search/recent': {
      get: {
        tags: ['Search'],
        summary: 'Get recent content',
        description: 'Retrieve recently added content',
        security: [],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { 
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20
            },
            description: 'Maximum number of results to return',
            example: 20,
          },
        ],
        responses: {
          200: {
            description: 'Recent content',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: {
                          type: 'object',
                          properties: {
                            total: { type: 'integer', example: 10 },
                            results: {
                              type: 'array',
                              items: { $ref: '#/components/schemas/Content' },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
};