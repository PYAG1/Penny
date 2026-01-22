import { Context } from 'hono';
import { contentService } from '../services/content.service';
import { contentRepository } from '../repositories';
import { successResponse, errorResponse } from '../utils/response';
import { getSafeErrorMessage } from '../utils/error';

// Limits
const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_TOTAL_PAGES = 50;

/**
 * Handle document uploads
 * POST /api/contents/documents
 */
export const handleUploadDocuments = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const context = formData.get('context') as string | undefined;

    const files: Array<{ buffer: Buffer; filename: string; contentType: string }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('file') && value && typeof value === 'object' && 'arrayBuffer' in value) {
        const file = value as File;

        // Validate file type
        if (file.type !== 'application/pdf') {
          return c.json(errorResponse(`File "${file.name}" is not a PDF`), 400);
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          return c.json(
            errorResponse(`File "${file.name}" exceeds maximum size of 20MB`),
            400
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        files.push({
          buffer: Buffer.from(arrayBuffer),
          filename: file.name,
          contentType: file.type,
        });
      }
    }

    if (files.length === 0) {
      return c.json(errorResponse('No PDF files provided'), 400);
    }

    if (files.length > MAX_FILES) {
      return c.json(errorResponse(`Maximum ${MAX_FILES} files allowed per request`), 400);
    }

    // Process each document
    const results = await Promise.all(
      files.map((file) =>
        contentService.processDocument({
          buffer: file.buffer,
          filename: file.filename,
          contentType: file.contentType,
          context,
        })
      )
    );

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    // Check total pages limit
    const totalPages = successful.reduce((sum, r) => sum + (r.pageCount || 0), 0);
    if (totalPages > MAX_TOTAL_PAGES) {
      console.warn(`[DocumentController] Total pages (${totalPages}) exceeds limit`);
    }

    return c.json(
      successResponse({
        processed: files.length,
        successful: successful.length,
        failed: failed.length,
        totalPages,
        results,
      })
    );
  } catch (error: unknown) {
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
};

/**
 * Get all documents
 * GET /api/contents/documents
 */
export const handleGetAllDocuments = async (c: Context) => {
  try {
    const documents = await contentRepository.findByType(['document']);

    return c.json(
      successResponse({
        total: documents.length,
        contents: documents.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          description: item.description,
          fileUrl: item.fileUrl,
          status: item.status,
          metadata: item.metadata,
          createdAt: item.createdAt,
        })),
      })
    );
  } catch (error: unknown) {
    return c.json(errorResponse(getSafeErrorMessage(error)), 500);
  }
};