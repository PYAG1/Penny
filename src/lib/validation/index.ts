import { z } from 'zod';

/**
 * Schema for creating URL content (webpage or YouTube video)
 */
export const createUrlContentSchema = z.object({
  url: z.string().url('Invalid URL format'),
  userNote: z.string().optional(),
});

export type CreateUrlContentInput = z.infer<typeof createUrlContentSchema>;
