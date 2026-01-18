import { z } from 'zod';

export const createUrlContentSchema = z.object({
  url: z.string().url('Invalid URL format'),
  userNote: z.string().optional(),
});

export type CreateUrlContentInput = z.infer<typeof createUrlContentSchema>;

const baseMetadataSchema = z.object({
  tags: z.array(z.string()).optional(),
  context: z.string().optional(),
});

/**
 * Image-specific metadata
 */
export const imageMetadataSchema = baseMetadataSchema.extend({
  originalFilename: z.string().optional(),
  fileSize: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.enum(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']).optional(),
});

/**
 * Webpage-specific metadata
 */
export const webpageMetadataSchema = baseMetadataSchema.extend({
  domain: z.string().optional(),
  favicon: z.string().url().optional(),
  author: z.string().optional(),
  publishedDate: z.string().datetime().optional(),
  wordCount: z.number().int().nonnegative().optional(),
  language: z.string().optional(),
});

/**
 * YouTube-specific metadata
 */
export const youtubeMetadataSchema = baseMetadataSchema.extend({
  domain: z.literal('youtube.com'),
  channel: z.string(),
  videoId: z.string(),
  duration: z.number().int().nonnegative().optional(),
  viewCount: z.number().int().nonnegative().optional(),
  publishedAt: z.string().datetime().optional(),
  categoryId: z.string().optional(),
});

/**
 * Note-specific metadata (for future use)
 */
export const noteMetadataSchema = baseMetadataSchema.extend({
  format: z.enum(['markdown', 'plaintext', 'html']).optional(),
  wordCount: z.number().int().nonnegative().optional(),
  version: z.number().int().positive().optional(),
});

/**
 * Discriminated union for all content metadata types
 */
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

/**
 * Helper function to validate and sanitize metadata based on content type
 */
export function validateMetadata(
  contentType: 'image' | 'webpage' | 'youtube' | 'note',
  metadata: unknown
): z.infer<typeof imageMetadataSchema> |
   z.infer<typeof webpageMetadataSchema> |
   z.infer<typeof youtubeMetadataSchema> |
   z.infer<typeof noteMetadataSchema> {

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

  // Parse and validate - will throw ZodError if invalid
  const validated = schema.parse(metadata);

  return validated;
}

/**
 * Safe validation that returns parsed data or null on error
 */
export function safeValidateMetadata(
  contentType: 'image' | 'webpage' | 'youtube' | 'note',
  metadata: unknown
): {
  success: boolean;
  data?: any;
  error?: z.ZodError;
} {
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


export type ImageMetadata = z.infer<typeof imageMetadataSchema>;
export type WebpageMetadata = z.infer<typeof webpageMetadataSchema>;
export type YouTubeMetadata = z.infer<typeof youtubeMetadataSchema>;
export type NoteMetadata = z.infer<typeof noteMetadataSchema>;
export type ContentMetadata = ImageMetadata | WebpageMetadata | YouTubeMetadata | NoteMetadata;
