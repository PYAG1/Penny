-- Rename bookmarks table to contents
ALTER TABLE "bookmarks" RENAME TO "contents";

-- Rename bookmark_type enum to content_type
ALTER TYPE "bookmark_type" RENAME TO "content_type";

-- Rename bookmark_status enum to content_status
ALTER TYPE "bookmark_status" RENAME TO "content_status";

-- Rename chunks table to content_chunks
ALTER TABLE "chunks" RENAME TO "content_chunks";

-- Rename bookmark_id column to content_id in content_chunks
ALTER TABLE "content_chunks" RENAME COLUMN "bookmark_id" TO "content_id";

-- Rename indexes on contents table
ALTER INDEX "idx_bookmarks_type" RENAME TO "idx_contents_type";
ALTER INDEX "idx_bookmarks_status" RENAME TO "idx_contents_status";
ALTER INDEX "idx_bookmarks_created_at" RENAME TO "idx_contents_created_at";

-- Rename indexes on content_chunks table
ALTER INDEX "idx_chunks_bookmark_id" RENAME TO "idx_content_chunks_content_id";
ALTER INDEX "idx_chunks_chunk_index" RENAME TO "idx_content_chunks_chunk_index";

-- Rename foreign key constraint
ALTER TABLE "content_chunks" RENAME CONSTRAINT "fk_chunks_bookmark_id" TO "fk_content_chunks_content_id";

-- Add HNSW index for vector similarity search (if not exists)
CREATE INDEX IF NOT EXISTS "idx_content_chunks_embedding" ON "content_chunks" USING hnsw ("embedding" vector_cosine_ops);
