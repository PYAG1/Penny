import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { nanoid } from 'nanoid';
import { contentRepository } from '../repositories';
import { webExtractionService } from '../lib/extraction/web';
import { youtubeExtractionService } from '../lib/extraction/youtube';
import { generateEmbeddings, chunkText, chunkDocument } from '../lib/ai/embeddings';
import { createUrlContentSchema } from '../lib/validation';
import { successResponse, errorResponse } from '../utils/response';
import { getErrorMessage, getSafeErrorMessage } from '../utils/error';

const urlController = new Hono();

/**
 * POST /api/urls
 * Process a URL (webpage or YouTube video)
 */
urlController.post(
  '/',
  zValidator('json', createUrlContentSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        errorResponse(result.error.issues.map((e) => e.message).join(', ')),
        400
      );
    }
  }),
  async (c) => {
    const { url, userNote } = c.req.valid('json');

    const contentId = `url_${nanoid()}`;
    const isYouTube = webExtractionService.isYouTubeUrl(url);

    try {
      // Step 1: Extract content
      const extractedContent = isYouTube
        ? await youtubeExtractionService.extractContent(url)
        : await webExtractionService.extractContent(url);

        console.log(extractedContent)
      // Step 2: Save content to database (without embedding)
      const content = await contentRepository.create({
        id: contentId,
        type: isYouTube ? 'youtube' : 'webpage',
        url,
        title: extractedContent.title,
        description: extractedContent.description,
        contentPreview: extractedContent.content.substring(0, 500),
        imageUrl: extractedContent.thumbnail,
        status: 'completed',
        metadata: {
          domain: extractedContent.metadata.domain,
          favicon: 'favicon' in extractedContent.metadata ? extractedContent.metadata.favicon : undefined,
          author: 'author' in extractedContent.metadata ? extractedContent.metadata.author : undefined,
          channel: 'channel' in extractedContent.metadata ? extractedContent.metadata.channel : undefined,
          videoId: 'videoId' in extractedContent.metadata ? extractedContent.metadata.videoId : undefined,
        },
      });

      // Step 3: Chunk the full content and generate embeddings
      const fullText = userNote
        ? `${userNote}\n${extractedContent.title}\n${extractedContent.description}\n${extractedContent.content}`
        : `${extractedContent.title}\n${extractedContent.description}\n${extractedContent.content}`;

      // Use structure-aware chunking for long content (books, long articles)
      const textChunks = fullText.length > 5000
        ? chunkDocument(fullText)
        : chunkText(fullText);
      const embeddings = await generateEmbeddings(textChunks.map((c) => c.content));

      // Step 4: Save chunks with embeddings
      await contentRepository.createChunks(
        contentId,
        textChunks.map((chunk, i) => ({
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          embedding: embeddings[i],
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          section: chunk.section,
        }))
      );

      return c.json(
        successResponse({
          content: {
            id: content.id,
            type: content.type,
            title: content.title,
            description: content.description,
            url: content.url,
            imageUrl: content.imageUrl,
          },
          chunksCreated: textChunks.length,
        })
      );
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`[URL] Failed to process ${url}:`, errorMsg);

      // Try to record the failure, but don't let recording failures cause more issues
      try {
        await contentRepository.create({
          id: contentId,
          type: isYouTube ? 'youtube' : 'webpage',
          url,
          title: 'Failed to process',
          description: 'Content extraction failed',
          status: 'failed',
          errorMessage: errorMsg,
          metadata: {},
        });
      } catch (recordError: unknown) {
        console.error(`[URL] Failed to record failure for ${url}:`, getErrorMessage(recordError));
      }

      return c.json(
        errorResponse(getSafeErrorMessage(error)),
        500
      );
    }
  }
);

/**
 * GET /api/urls/failed
 * Get all failed content items
 */
urlController.get('/failed', async (c) => {
  try {
    const failedContents = await contentRepository.findFailed();

    return c.json(
      successResponse({
        contents: failedContents.map((item) => ({
          id: item.id,
          type: item.type,
          url: item.url,
          title: item.title,
          errorMessage: item.errorMessage,
          createdAt: item.createdAt,
          processingAttempts: item.processingAttempts,
        })),
      })
    );
  } catch (error: unknown) {
    console.error('[Failed] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

/**
 * POST /api/urls/retry/:id
 * Retry a failed content item
 */
urlController.post('/retry/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const content = await contentRepository.findById(id);

    if (!content) {
      return c.json(errorResponse('Content not found'), 404);
    }

    if (content.status !== 'failed') {
      return c.json(errorResponse('Content is not in failed state'), 400);
    }

    if (content.type !== 'image' && content.url) {
      await contentRepository.updateStatus(id, 'processing');

      try {
        const isYouTube = webExtractionService.isYouTubeUrl(content.url);
        const extractedContent = isYouTube
          ? await youtubeExtractionService.extractContent(content.url)
          : await webExtractionService.extractContent(content.url);

        // Update content without embedding
        await contentRepository.update(id, {
          title: extractedContent.title,
          description: extractedContent.description,
          contentPreview: extractedContent.content.substring(0, 500),
          imageUrl: extractedContent.thumbnail,
          status: 'completed',
          errorMessage: null,
          metadata: {
            domain: extractedContent.metadata.domain,
            favicon: 'favicon' in extractedContent.metadata ? extractedContent.metadata.favicon : undefined,
            author: 'author' in extractedContent.metadata ? extractedContent.metadata.author : undefined,
            channel: 'channel' in extractedContent.metadata ? extractedContent.metadata.channel : undefined,
            videoId: 'videoId' in extractedContent.metadata ? extractedContent.metadata.videoId : undefined,
          },
        });

        // Delete any existing chunks and create new ones
        await contentRepository.deleteChunks(id);

        const fullText = `${extractedContent.title}\n${extractedContent.description}\n${extractedContent.content}`;
        // Use structure-aware chunking for long content
        const textChunks = fullText.length > 5000
          ? chunkDocument(fullText)
          : chunkText(fullText);
        const embeddings = await generateEmbeddings(textChunks.map((c) => c.content));

        await contentRepository.createChunks(
          id,
          textChunks.map((chunk, i) => ({
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: embeddings[i],
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            section: chunk.section,
          }))
        );

        return c.json(successResponse({ contentId: id, chunksCreated: textChunks.length }));
      } catch (error: unknown) {
        await contentRepository.updateStatus(id, 'failed', getErrorMessage(error));
        return c.json(errorResponse(getSafeErrorMessage(error)), 500);
      }
    }

    return c.json(errorResponse('Image content requires re-upload to retry'));
  } catch (error: unknown) {
    console.error('[Retry] Error:', error);
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
});

export { urlController };
