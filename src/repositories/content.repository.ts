import {
    db,
    contents,
    contentChunks,
    type Content,
    type NewContent,
    type ContentStatus,
    type ContentChunk,
    type NewContentChunk,
} from '../lib/db';
import { eq, desc, sql, inArray } from 'drizzle-orm';

export const contentRepository = {

    
    /**
     * Create a new content
     */
    async create(data: NewContent): Promise<Content> {
        const [content] = await db.insert(contents).values(data).returning();
        return content;
    },

    /**
     * Update content by ID
     */
    async update(id: string, data: Partial<Omit<NewContent, 'id'>>): Promise<Content | null> {
        const [content] = await db
            .update(contents)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(contents.id, id))
            .returning();
        return content || null;
    },

    /**
     * Update content status
     */
    async updateStatus(id: string, status: ContentStatus, errorMessage?: string): Promise<void> {
        await db
            .update(contents)
            .set({
                status,
                errorMessage: errorMessage || null,
                processingAttempts: sql`${contents.processingAttempts} + 1`,
                updatedAt: new Date(),
                completedAt: status === 'completed' ? new Date() : null,
            })
            .where(eq(contents.id, id));
    },

    /**
     * Get content by ID
     */
    async findById(id: string): Promise<Content | null> {
        const [content] = await db.select().from(contents).where(eq(contents.id, id));
        return content || null;
    },

    /**
     * Get all failed contents
     */
    async findFailed(): Promise<Content[]> {
        return db
            .select()
            .from(contents)
            .where(eq(contents.status, 'failed'))
            .orderBy(desc(contents.createdAt));
    },

    /**
     * Get all contents
     */
    async findAll(): Promise<Content[]> {
        return db
            .select()
            .from(contents)
            .orderBy(desc(contents.createdAt));
    },

    /**
     * Get contents by type(s)
     */
    async findByType(types: ('image' | 'webpage' | 'youtube' | 'document')[]): Promise<Content[]> {
        return db
            .select()
            .from(contents)
            .where(inArray(contents.type, types))
            .orderBy(desc(contents.createdAt));
    },

    /**
     * Search contents using vector similarity on chunks
     * Returns contents with their best matching chunk
     */
    async searchByEmbedding(
        queryEmbedding: number[],
        options: {
            limit?: number;
            threshold?: number;
            type?: 'image' | 'webpage' | 'youtube' | 'document' | 'all';
        } = {}
    ): Promise<(Content & { similarity: number; matchedChunk: string; matchedSection?: string })[]> {
        const { limit = 20, threshold = 0.3, type = 'all' } = options;

        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        // Search chunks and join back to contents, getting the best chunk per content
        const results = await db.execute<Content & { similarity: number; matched_chunk: string; matched_section: string | null }>(sql`
      WITH ranked_chunks AS (
        SELECT
          c.content_id,
          c.content as matched_chunk,
          c.section as matched_section,
          1 - (c.embedding <=> ${embeddingStr}::vector) as similarity,
          ROW_NUMBER() OVER (PARTITION BY c.content_id ORDER BY c.embedding <=> ${embeddingStr}::vector) as rn
        FROM content_chunks c
        WHERE
          c.embedding IS NOT NULL
          AND 1 - (c.embedding <=> ${embeddingStr}::vector) > ${threshold}
      )
      SELECT
        t.*,
        rc.similarity,
        rc.matched_chunk,
        rc.matched_section
      FROM ranked_chunks rc
      JOIN contents t ON t.id = rc.content_id
      WHERE
        rc.rn = 1
        AND t.status = 'completed'
        ${type !== 'all' ? sql`AND t.type = ${type}` : sql``}
      ORDER BY rc.similarity DESC
      LIMIT ${limit}
    `);

        return (results as unknown as (Content & { similarity: number; matched_chunk: string; matched_section: string | null })[]).map(r => ({
            ...r,
            matchedChunk: r.matched_chunk,
            matchedSection: r.matched_section ?? undefined,
        }));
    },

    /**
     * Create chunks for a content
     */
    async createChunks(
        contentId: string,
        chunkData: Omit<NewContentChunk, 'id' | 'contentId'>[]
    ): Promise<ContentChunk[]> {
        if (chunkData.length === 0) return [];

        const chunksToInsert: NewContentChunk[] = chunkData.map((chunk, index) => ({
            id: `chunk_${contentId}_${index}`,
            contentId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            embedding: chunk.embedding,
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
            section: chunk.section,
        }));

        const result = await db.insert(contentChunks).values(chunksToInsert).returning();
        return result;
    },

    /**
     * Delete all chunks for a content
     */
    async deleteChunks(contentId: string): Promise<void> {
        await db.delete(contentChunks).where(eq(contentChunks.contentId, contentId));
    },

    /**
     * Get chunks for a content
     */
    async findChunksByContentId(contentId: string): Promise<ContentChunk[]> {
        return db
            .select()
            .from(contentChunks)
            .where(eq(contentChunks.contentId, contentId))
            .orderBy(contentChunks.chunkIndex);
    },

    /**
     * Get recent contents
     */
    async findRecent(limit: number = 20): Promise<Content[]> {
        return db
            .select()
            .from(contents)
            .where(eq(contents.status, 'completed'))
            .orderBy(desc(contents.createdAt))
            .limit(limit);
    },

    /**
     * Delete content by ID
     */
    async delete(id: string): Promise<boolean> {
        const result = await db.delete(contents).where(eq(contents.id, id));
        return result.length > 0;
    },
};
