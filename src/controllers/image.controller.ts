import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { contentRepository } from '../repositories';
import { blobStorageService } from '../lib/storage/blob';
import { imageAnalysisService } from '../lib/ai/image-analysis';
import { generateEmbeddings, chunkText } from '../lib/ai/embeddings';
import { successResponse, errorResponse } from '../utils/response';
import { getErrorMessage, getSafeErrorMessage } from '../utils/error';

const imageController = new Hono();

/**
 * POST /api/images
 * Upload and process images/screenshots
 */
imageController.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const context = formData.get('context') as string | undefined;

    const files: Array<{ buffer: Buffer; filename: string; contentType: string }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('image') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        const file = value as File;
        const arrayBuffer = await file.arrayBuffer();
        files.push({
          buffer: Buffer.from(arrayBuffer),
          filename: file.name,
          contentType: file.type || 'image/png',
        });
      }
    }

    if (files.length === 0) {
      return c.json(errorResponse('No images provided'), 400);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const contentId = `img_${nanoid()}`;

        try {
          // Step 1: Upload to blob storage
          const blobUrl = await blobStorageService.uploadImage(file.buffer, file.contentType);

          // Step 2: Analyze image with Gemini
          const metadata = await imageAnalysisService.analyze(file.buffer, file.contentType, context);

          // Step 3: Create content record (without embedding - it's now on chunks)
          const content = await contentRepository.create({
            id: contentId,
            type: 'image',
            url: null,
            title: metadata.title,
            description: metadata.description,
            contentPreview: metadata.description.substring(0, 500),
            imageUrl: blobUrl,
            status: 'completed',
            metadata: {
              tags: metadata.tags,
              context,
              originalFilename: file.filename,
              fileSize: file.buffer.length,
            },
          });

          // Step 4: Chunk the content and generate embeddings
          const textForEmbedding = `${metadata.title}\n${metadata.description}\n${metadata.tags.join(' ')}`;
          const textChunks = chunkText(textForEmbedding);
          const embeddings = await generateEmbeddings(textChunks.map((c) => c.content));

          // Step 5: Save chunks with embeddings
          await contentRepository.createChunks(
            contentId,
            textChunks.map((chunk, i) => ({
              chunkIndex: chunk.chunkIndex,
              content: chunk.content,
              embedding: embeddings[i],
              startOffset: chunk.startOffset,
              endOffset: chunk.endOffset,
            }))
          );

          return {
            success: true,
            contentId,
            title: content.title,
          };
        } catch (error: unknown) {
          console.error(`[Images] Failed to process ${file.filename}:`, error);

          await contentRepository.create({
            id: contentId,
            type: 'image',
            url: null,
            title: file.filename,
            description: 'Failed to process',
            status: 'failed',
            errorMessage: getErrorMessage(error),
            metadata: {
              originalFilename: file.filename,
            },
          });

          return {
            success: false,
            contentId,
            error: getErrorMessage(error),
          };
        }
      })
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return c.json(
      successResponse({
        processed: files.length,
        successful: successful.length,
        failed: failed.length,
        results,
      })
    );
  } catch (error: unknown) {
    console.error('[Images] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

export { imageController };
