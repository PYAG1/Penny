import { z } from 'zod';

// Response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string().optional(),
});

export const ErrorResponseSchema = z.object({
  success: z.boolean(),
  error: z.string(),
  message: z.string().optional(),
});

// Content schemas
export const ContentSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'webpage', 'youtube', 'note']),
  url: z.string().url().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ContentChunkSchema = z.object({
  id: z.string(),
  contentId: z.string(),
  chunkIndex: z.number(),
  text: z.string(),
  embedding: z.array(z.number()).optional(),
  createdAt: z.string().datetime(),
});

// Search result schema
export const SearchResultSchema = ContentSchema.extend({
  similarity: z.number(),
  matchedChunk: z.string().optional(),
  matchedSection: z.string().optional(),
});

// API response schemas
export const ImageUploadResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    processed: z.number(),
    successful: z.number(),
    failed: z.number(),
    results: z.array(z.any()),
  }),
});

export const UrlProcessResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    content: ContentSchema.pick({
      id: true,
      type: true,
      title: true,
      description: true,
      url: true,
      imageUrl: true,
    }),
    chunksCreated: z.number(),
  }),
});

export const SearchResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    query: z.string(),
    total: z.number(),
    results: z.array(SearchResultSchema),
  }),
});

export const RecentContentResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    total: z.number(),
    results: z.array(ContentSchema),
  }),
});

export const FailedContentSchema = z.object({
  id: z.string(),
  type: z.enum(['image', 'webpage', 'youtube', 'note']),
  url: z.string().url().nullable(),
  title: z.string(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  processingAttempts: z.number(),
});

export const FailedContentResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    contents: z.array(FailedContentSchema),
  }),
});

export const RetryResponseSchema = SuccessResponseSchema.extend({
  data: z.object({
    contentId: z.string(),
    chunksCreated: z.number(),
  }),
});

// Health check schemas
export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  service: z.string(),
  version: z.string(),
  timestamp: z.string().datetime(),
  uptime: z.number(),
  checks: z.record(z.string(), z.object({
    status: z.enum(['ok', 'error']),
    message: z.string().optional(),
    responseTime: z.number().optional(),
  })).optional(),
});

// Type exports
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type Content = z.infer<typeof ContentSchema>;
export type ContentChunk = z.infer<typeof ContentChunkSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type ImageUploadResponse = z.infer<typeof ImageUploadResponseSchema>;
export type UrlProcessResponse = z.infer<typeof UrlProcessResponseSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
export type RecentContentResponse = z.infer<typeof RecentContentResponseSchema>;
export type FailedContentResponse = z.infer<typeof FailedContentResponseSchema>;
export type RetryResponse = z.infer<typeof RetryResponseSchema>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;