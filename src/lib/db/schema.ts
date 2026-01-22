import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  index,
  vector,
  pgEnum,
} from 'drizzle-orm/pg-core';
export const contentTypeEnum = pgEnum('content_type', ['image', 'webpage', 'youtube', 'document']);
export const contentStatusEnum = pgEnum('content_status', ['pending', 'processing', 'completed', 'failed']);

// Embedding dimensions (Google text-embedding-001)
export const EMBEDDING_DIMENSIONS = 1536;

// Contents table (formerly bookmarks)
export const contents = pgTable(
  'contents',
  {
    id: text('id').primaryKey(),
    type: contentTypeEnum('type').notNull(),
    url: text('url'),
    fileUrl: text('file_url'),
    title: text('title').notNull(),
    description: text('description').notNull(),
    contentPreview: text('content_preview'),
    imageUrl: text('image_url'),
    status: contentStatusEnum('status').notNull().default('pending'),
    errorMessage: text('error_message'),
    processingAttempts: integer('processing_attempts').notNull().default(0),

    // Metadata as JSONB
    metadata: jsonb('metadata').$type<{
      domain?: string;
      favicon?: string;
      author?: string;
      channel?: string;
      duration?: number;
      videoId?: string;
      tags?: string[];
      context?: string;
      originalFilename?: string;
      fileSize?: number;

      mimeType?: string;
      pageCount?: number;
      pdfMetadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
        creator?: string;
        producer?: string;
        creationDate?: string;
        modificationDate?: string;
      };
    }>().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_contents_type').on(table.type),
    index('idx_contents_status').on(table.status),
    index('idx_contents_created_at').on(table.createdAt),
  ]
);


export const contentChunks = pgTable(
  'content_chunks',
  {
    id: text('id').primaryKey(),
    contentId: text('content_id')
      .notNull()
      .references(() => contents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
    chunkIndex: integer('chunk_index').notNull(),
    startOffset: integer('start_offset'),
    endOffset: integer('end_offset'),
    section: text('section'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_content_chunks_content_id').on(table.contentId),
    index('idx_content_chunks_embedding').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops')
    ),
  ]
);

export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;
export type ContentChunk = typeof contentChunks.$inferSelect;
export type NewContentChunk = typeof contentChunks.$inferInsert;
export type ContentType = 'image' | 'webpage' | 'youtube' | 'document';
export type ContentStatus = 'pending' | 'processing' | 'completed' | 'failed';
