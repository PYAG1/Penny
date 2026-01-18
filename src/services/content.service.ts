import { nanoid } from 'nanoid';
import { contentRepository } from '../repositories';
import { blobStorageService } from '../lib/storage/blob';
import { imageAnalysisService } from '../lib/ai/image-analysis';
import { webExtractionService } from '../lib/extraction/web';
import { youtubeExtractionService } from '../lib/extraction/youtube';
import { generateEmbeddings, chunkText, chunkDocument } from '../lib/ai/embeddings';
import { getErrorMessage } from '../utils/error';

// Type definitions for service method inputs/outputs
export interface ProcessImageInput {
  buffer: Buffer;
  filename: string;
  contentType: string;
  context?: string;
}

export interface ProcessImageOutput {
  success: boolean;
  contentId: string;
  title?: string;
  error?: string;
}

export interface ProcessUrlInput {
  url: string;
  userNote?: string;
}

export interface ProcessUrlOutput {
  contentId: string;
  type: 'youtube' | 'webpage';
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  chunksCreated: number;
}

/**
 * ContentService
 * Handles business logic for content processing (images, URLs, YouTube videos)
 * Orchestrates between repositories, lib utilities, and external APIs
 */
export class ContentService {
  /**
   * Process a single image: upload to blob storage, analyze with AI, chunk, and generate embeddings
   */
  async processImage(input: ProcessImageInput): Promise<ProcessImageOutput> {
    const contentId = `img_${nanoid()}`;

    try {
      // Step 1: Upload to blob storage
      const blobUrl = await blobStorageService.uploadImage(input.buffer, input.contentType);

      // Step 2: Analyze image with Gemini
      const metadata = await imageAnalysisService.analyze(
        input.buffer,
        input.contentType,
        input.context
      );

      // Step 3: Apply defaults for title/description
      const title = metadata.title || input.filename;
      const description = metadata.description || 'Image uploaded';

      // Step 4: Create content record (without embedding - it's now on chunks)
      const content = await contentRepository.create({
        id: contentId,
        type: 'image',
        url: null,
        title,
        description,
        contentPreview: description.substring(0, 500),
        imageUrl: blobUrl,
        status: 'completed',
        metadata: {
          tags: metadata.tags,
          context: input.context,
          originalFilename: input.filename,
          fileSize: input.buffer.length,
        },
      });

      // Step 5: Chunk the content and generate embeddings
      const textForEmbedding = `${title}\n${description}\n${metadata.tags.join(' ')}`;
      const textChunks = chunkText(textForEmbedding);
      const embeddings = await generateEmbeddings(textChunks.map((c) => c.content));

      // Step 6: Save chunks with embeddings
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
      const errorMsg = getErrorMessage(error);
      console.error(`[ContentService] Failed to process image ${input.filename}:`, errorMsg);

      // Record failure in database
      try {
        await contentRepository.create({
          id: contentId,
          type: 'image',
          url: null,
          title: input.filename,
          description: 'Failed to process',
          status: 'failed',
          errorMessage: errorMsg,
          metadata: {
            originalFilename: input.filename,
          },
        });
      } catch (recordError: unknown) {
        console.error(
          `[ContentService] Failed to record image failure:`,
          getErrorMessage(recordError)
        );
      }

      return {
        success: false,
        contentId,
        error: errorMsg,
      };
    }
  }

  /**
   * Process a URL (webpage or YouTube video): extract content, chunk, and generate embeddings
   */
  async processUrl(input: ProcessUrlInput): Promise<ProcessUrlOutput> {
    const contentId = `url_${nanoid()}`;
    const isYouTube = webExtractionService.isYouTubeUrl(input.url);

    try {
      // Step 1: Extract content
      const extractedContent = isYouTube
        ? await youtubeExtractionService.extractContent(input.url)
        : await webExtractionService.extractContent(input.url);

      // Step 2: Apply defaults for title/description
      const title = extractedContent.title || 'Untitled';
      const description = extractedContent.description || '';

      // Step 3: Save content to database (without embedding)
      const content = await contentRepository.create({
        id: contentId,
        type: isYouTube ? 'youtube' : 'webpage',
        url: input.url,
        title,
        description,
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

      // Step 4: Chunk the full content and generate embeddings
      const fullText = input.userNote
        ? `${input.userNote}\n${title}\n${description}\n${extractedContent.content}`
        : `${title}\n${description}\n${extractedContent.content}`;

      // Use structure-aware chunking for long content (books, long articles)
      const textChunks = fullText.length > 5000 ? chunkDocument(fullText) : chunkText(fullText);
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
          section: chunk.section,
        }))
      );

      return {
        contentId: content.id,
        type: content.type as 'youtube' | 'webpage',
        title: content.title,
        description: content.description,
        url: content.url!,
        imageUrl: content.imageUrl,
        chunksCreated: textChunks.length,
      };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`[ContentService] Failed to process URL ${input.url}:`, errorMsg);

      // Try to record the failure
      try {
        await contentRepository.create({
          id: contentId,
          type: isYouTube ? 'youtube' : 'webpage',
          url: input.url,
          title: 'Failed to process',
          description: 'Content extraction failed',
          status: 'failed',
          errorMessage: errorMsg,
          metadata: {},
        });
      } catch (recordError: unknown) {
        console.error(
          `[ContentService] Failed to record URL failure:`,
          getErrorMessage(recordError)
        );
      }

      throw new Error(`Failed to process URL: ${errorMsg}`);
    }
  }

  /**
   * Retry processing a failed content item
   * Only supports URL-based content (webpage/youtube), images require re-upload
   */
  async retryFailedContent(contentId: string): Promise<{ chunksCreated: number }> {
    const content = await contentRepository.findById(contentId);

    if (!content) {
      throw new Error('Content not found');
    }

    if (content.status !== 'failed') {
      throw new Error('Content is not in failed state');
    }

    if (content.type === 'image' || !content.url) {
      throw new Error('Image content requires re-upload to retry');
    }

    // Update status to processing
    await contentRepository.updateStatus(contentId, 'processing');

    try {
      const isYouTube = webExtractionService.isYouTubeUrl(content.url);

      // Step 1: Re-extract content
      const extractedContent = isYouTube
        ? await youtubeExtractionService.extractContent(content.url)
        : await webExtractionService.extractContent(content.url);

      // Step 2: Update content record (without embedding)
      await contentRepository.update(contentId, {
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

      // Step 3: Delete any existing chunks and create new ones
      await contentRepository.deleteChunks(contentId);

      const fullText = `${extractedContent.title}\n${extractedContent.description}\n${extractedContent.content}`;
      // Use structure-aware chunking for long content
      const textChunks = fullText.length > 5000 ? chunkDocument(fullText) : chunkText(fullText);
      const embeddings = await generateEmbeddings(textChunks.map((c) => c.content));

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

      return { chunksCreated: textChunks.length };
    } catch (error: unknown) {
      const errorMsg = getErrorMessage(error);
      console.error(`[ContentService] Retry failed for ${contentId}:`, errorMsg);

      // Update status back to failed
      await contentRepository.updateStatus(contentId, 'failed', errorMsg);

      throw new Error(`Failed to retry content: ${errorMsg}`);
    }
  }
}

// Export singleton instance
export const contentService = new ContentService();
