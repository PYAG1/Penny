import { z } from 'zod';

// Image schemas
export const CreateImageSchema = z.object({
  context: z.string().optional(),
});

// URL schemas  
export const CreateUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
  userNote: z.string().optional(),
});

export type CreateUrlInput = z.infer<typeof CreateUrlSchema>;

// Search schemas
export const SearchQuerySchema = z.object({
  q: z.string().min(1, 'Query is required'),
  type: z.enum(['image', 'webpage', 'youtube', 'all']).default('all').optional(),
  limit: z.coerce.number().int().positive().default(20).optional(),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;

export const RecentContentSchema = z.object({
  limit: z.coerce.number().int().positive().default(20).optional(),
});

// Metadata schemas
const baseMetadataSchema = z.object({
  tags: z.array(z.string()).optional(),
  context: z.string().optional(),
});

export const imageMetadataSchema = baseMetadataSchema.extend({
  originalFilename: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']).optional(),
});

export const webpageMetadataSchema = baseMetadataSchema.extend({
  domain: z.string().optional(),
  favicon: z.string().url().optional(),
  author: z.string().optional(),
  publishedDate: z.string().datetime().optional(),
  wordCount: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
});

export const youtubeMetadataSchema = baseMetadataSchema.extend({
  domain: z.literal('youtube.com'),
  channel: z.string(),
  videoId: z.string(),
  duration: z.number().int().nonnegative().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  publishedAt: z.string().datetime().optional(),
  categoryId: z.string().optional(),
});

export const noteMetadataSchema = baseMetadataSchema.extend({
  format: z.enum(['markdown', 'plaintext', 'html']).optional(),
  wordCount: z.number().int().nonnegative().optional(),
  version: z.number().int().positive().optional(),
});

export const contentMetadataSchema = z.discriminatedUnion('contentType', [
  z.object({
    contentType: z.literal('image'),
    data: imageMetadataSchema,
  }),
  z.object({
    contentType: z.literal('webpage'),
    data: webpageMetadataSchema,
  }),
  z.object({
    contentType: z.literal('youtube'),
    data: youtubeMetadataSchema,
  }),
  z.object({
    contentType: z.literal('note'),
    data: noteMetadataSchema,
  }),
]);

// Validation functions
export function validateMetadata(
  contentType: 'image' | 'webpage' | 'youtube' | 'note',
  metadata: unknown
) {
  let schema: z.ZodType;

  switch (contentType) {
    case 'image':
      schema = imageMetadataSchema;
      break;
    case 'webpage':
      schema = webpageMetadataSchema;
      break;
    case 'youtube':
      schema = youtubeMetadataSchema;
      break;
    case 'note':
      schema = noteMetadataSchema;
      break;
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }

  return schema.parse(metadata);
}

export function safeValidateMetadata(
  contentType: 'image' | 'webpage' | 'youtube' | 'note',
  metadata: unknown
) {
  let schema: z.ZodType;

  switch (contentType) {
    case 'image':
      schema = imageMetadataSchema;
      break;
    case 'webpage':
      schema = webpageMetadataSchema;
      break;
    case 'youtube':
      schema = youtubeMetadataSchema;
      break;
    case 'note':
      schema = noteMetadataSchema;
      break;
    default:
      return {
        success: false,
        error: new z.ZodError([{
          code: 'custom',
          path: ['contentType'],
          message: `Unknown content type: ${contentType}`,
        }]),
      };
  }

  const result = schema.safeParse(metadata);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  } else {
    return {
      success: false,
      error: result.error,
    };
  }
}

// Type exports
export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
export type WebpageMetadata = z.infer<typeof webpageMetadataSchema>;
export type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;
export type NoteMetadata = z.infer<typeof noteMetadataSchema>;
export type ContentMetadata = ImageMetadata | WebpageMetadata | YouTubeMetadata | NoteMetadata;