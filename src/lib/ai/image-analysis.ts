import { google } from '@ai-sdk/google';
import { generateText, Output } from 'ai';
import { z } from 'zod';

const imageMetadataSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the image (max 100 chars)'),
  description: z.string().describe('Detailed description of what the image contains, including key elements, text, and context'),
  tags: z.array(z.string()).describe('Relevant keywords and tags for searchability (5-10 tags)'),
});

export type ImageMetadata = z.infer<typeof imageMetadataSchema>;

export const imageAnalysisService = {
  /**
   * Analyze an image using Gemini Vision and extract metadata
   */
  async analyze(imageBuffer: Buffer, contentType: string, context?: string): Promise<ImageMetadata> {
    const prompt = context
      ? `Analyze this screenshot/image. User provided context: "${context}".
         Extract a descriptive title, detailed description, and relevant tags for search.`
      : `Analyze this screenshot/image.
         Extract a descriptive title, detailed description, and relevant tags for search.
         Focus on: text content, UI elements, data visualizations, or any notable content.`;

    const result = await generateText({
      model: google('gemini-2.0-flash-exp'),
      output: Output.object({ schema: imageMetadataSchema }),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image', image: imageBuffer, mediaType: contentType },
          ],
        },
      ],
    });

    console.log('[Image Analysis] Result:', result?.output);
    return result.output!;
  },

  /**
   * Analyze multiple images in batch
   */
  async analyzeMany(
    images: Array<{ buffer: Buffer; contentType: string; context?: string }>,
    options: { maxParallel?: number } = {}
  ): Promise<ImageMetadata[]> {
    const { maxParallel = 3 } = options;
    const results: ImageMetadata[] = [];

    for (let i = 0; i < images.length; i += maxParallel) {
      const batch = images.slice(i, i + maxParallel);
      const batchResults = await Promise.all(
        batch.map((img) => this.analyze(img.buffer, img.contentType, img.context))
      );
      results.push(...batchResults);

      if (i + maxParallel < images.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return results;
  },
};
