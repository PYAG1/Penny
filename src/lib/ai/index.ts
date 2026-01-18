/**
 * Embeddings Service
 *
 * Uses Vercel AI SDK with Google's text-embedding-004 model
 * to generate 768-dimensional embeddings for semantic search.
 *
 * Requires GOOGLE_GENERATIVE_AI_API_KEY environment variable.
 */

import { embed, embedMany, cosineSimilarity } from 'ai';
import { google } from '@ai-sdk/google';
import { getErrorMessage } from '../../utils/error';

// Using Google text-embedding-001 with 1536 dimensions for better semantic representation
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate embedding for a single text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.embeddingModel("gemini-embedding-001"),
      value: text,
      providerOptions: {
        google: {
          outputDimensionality: 1536,
        },
      },
    });

    return embedding;
  } catch (error: unknown) {
    console.error('[Embeddings] Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${getErrorMessage(error)}`);
  }
}

/**
 * Generate embeddings for multiple text strings in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(
  texts: string[],
  options: {
    maxParallelCalls?: number;
  } = {}
): Promise<number[][]> {
  const { maxParallelCalls = 5 } = options;

  try {
    const { embeddings } = await embedMany({
      model:  google.embeddingModel("gemini-embedding-001"),
      values: texts,
      maxParallelCalls,
      providerOptions: {
        google: {
          outputDimensionality: 1536,
        },
      },
    });

    return embeddings;
  } catch (error: unknown) {
    console.error('[Embeddings] Error generating batch embeddings:', error);
    throw new Error(`Failed to generate embeddings: ${getErrorMessage(error)}`);
  }
}

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1, where 1 means identical
 */
export function calculateSimilarity(
  embedding1: number[],
  embedding2: number[]
): number {
  return cosineSimilarity(embedding1, embedding2);
}

/**
 * Find most similar embeddings from a list
 */
export interface SimilarityMatch {
  index: number;
  similarity: number;
}

export function findMostSimilar(
  queryEmbedding: number[],
  candidateEmbeddings: number[][],
  options: {
    topK?: number;
    threshold?: number;
  } = {}
): SimilarityMatch[] {
  const { topK = 5, threshold = 0.0 } = options;

  // Calculate similarities
  const similarities: SimilarityMatch[] = candidateEmbeddings.map((embedding, index) => ({
    index,
    similarity: calculateSimilarity(queryEmbedding, embedding),
  }));

  // Filter by threshold and sort by similarity (descending)
  return similarities
    .filter((match) => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Prepare text for embedding by cleaning and truncating
 * Google's text-embedding-004 has a context window, so we need to ensure
 * text doesn't exceed it
 */
export function prepareTextForEmbedding(text: string, maxLength = 10000): string {
  // Clean the text
  let cleaned = text
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();

  // Truncate if needed
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    // Try to end at a sentence boundary
    const lastPeriod = cleaned.lastIndexOf('.');
    if (lastPeriod > maxLength * 0.8) {
      cleaned = cleaned.substring(0, lastPeriod + 1);
    }
  }

  return cleaned;
}

/**
 * Batch process texts with automatic batching
 * Useful for processing large numbers of chunks
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  options: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<number[][]> {
  const { batchSize = 100, onProgress } = options;

  const allEmbeddings: number[][] = [];
  const batches = Math.ceil(texts.length / batchSize);

  for (let i = 0; i < batches; i++) {
    const start = i * batchSize;
    const end = Math.min(start + batchSize, texts.length);
    const batch = texts.slice(start, end);

    console.log(`[Embeddings] Processing batch ${i + 1}/${batches} (${batch.length} items)`);

    const embeddings = await generateEmbeddings(batch, {
      maxParallelCalls: 5,
    });

    allEmbeddings.push(...embeddings);

    if (onProgress) {
      onProgress(end, texts.length);
    }

    // Small delay between batches to avoid rate limiting
    if (i < batches - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return allEmbeddings;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  section?: string;
}

/**
 * Split text into chunks for embedding
 * Uses sentence-boundary splitting with overlap for better semantic coherence
 */
export function chunkText(
  text: string,
  options: {
    maxChunkSize?: number;
    overlapSize?: number;
  } = {}
): TextChunk[] {
  const { maxChunkSize = 1000, overlapSize = 100 } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const cleanedText = text.replace(/\s+/g, ' ').trim();

  // If text is small enough, return as single chunk
  if (cleanedText.length <= maxChunkSize) {
    return [
      {
        content: cleanedText,
        chunkIndex: 0,
        startOffset: 0,
        endOffset: cleanedText.length,
      },
    ];
  }

  const chunks: TextChunk[] = [];
  let currentPosition = 0;
  let chunkIndex = 0;

  while (currentPosition < cleanedText.length) {
    let endPosition = Math.min(currentPosition + maxChunkSize, cleanedText.length);

    // Try to find a sentence boundary (. ! ?) near the end
    if (endPosition < cleanedText.length) {
      const searchStart = Math.max(currentPosition, endPosition - 200);
      const searchText = cleanedText.substring(searchStart, endPosition);

      // Find last sentence boundary
      const lastPeriod = searchText.lastIndexOf('. ');
      const lastExclamation = searchText.lastIndexOf('! ');
      const lastQuestion = searchText.lastIndexOf('? ');
      const lastNewline = searchText.lastIndexOf('\n');

      const boundaries = [lastPeriod, lastExclamation, lastQuestion, lastNewline]
        .filter((pos) => pos > 0)
        .map((pos) => searchStart + pos + 1);

      if (boundaries.length > 0) {
        endPosition = Math.max(...boundaries);
      }
    }

    const chunkContent = cleanedText.substring(currentPosition, endPosition).trim();

    if (chunkContent.length > 0) {
      chunks.push({
        content: chunkContent,
        chunkIndex,
        startOffset: currentPosition,
        endOffset: endPosition,
      });
      chunkIndex++;
    }

    // Move position forward, accounting for overlap
    currentPosition = endPosition - overlapSize;

    // Prevent infinite loop if overlap is too large
    if (currentPosition <= chunks[chunks.length - 1]?.startOffset) {
      currentPosition = endPosition;
    }
  }

  return chunks;
}

interface DocumentSection {
  title: string;
  content: string;
  startOffset: number;
  endOffset: number;
}

// Patterns for detecting document structure
const SECTION_PATTERNS = [
  // Markdown headings: # Chapter 1, ## Section 1.1
  /^(#{1,6})\s+(.+)$/gm,
  // Numbered chapters: Chapter 1, CHAPTER ONE, Chapter I
  /^(chapter|chapitre)\s+(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)[:\s\-]*(.*)?$/gim,
  // Part headings: Part 1, PART ONE
  /^(part)\s+(\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)[:\s\-]*(.*)?$/gim,
  // Section headings: Section 1, SECTION 1.1
  /^(section)\s+([\d.]+)[:\s\-]*(.*)?$/gim,
  // Numbered headings: 1. Introduction, 1.1 Overview
  /^(\d+(?:\.\d+)*)\s+([A-Z][^\n]+)$/gm,
  // All caps headings (likely titles): INTRODUCTION, THE BEGINNING
  /^([A-Z][A-Z\s]{4,50})$/gm,
];

/**
 * Detect sections/chapters in a document
 */
function detectSections(text: string): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const lines = text.split('\n');

  let currentSection: DocumentSection | null = null;
  let currentOffset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = currentOffset;
    const lineEnd = currentOffset + line.length;

    let isHeading = false;
    let headingTitle = '';

    // Check each pattern
    for (const pattern of SECTION_PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(line.trim());
      if (match) {
        isHeading = true;
        // Extract the heading text
        if (line.trim().startsWith('#')) {
          headingTitle = match[2].trim();
        } else if (match[3]) {
          headingTitle = `${match[1]} ${match[2]}: ${match[3]}`.trim();
        } else {
          headingTitle = line.trim();
        }
        break;
      }
    }

    if (isHeading) {
      // Save the previous section
      if (currentSection) {
        currentSection.endOffset = lineStart;
        currentSection.content = text.substring(currentSection.startOffset, currentSection.endOffset).trim();
        if (currentSection.content.length > 0) {
          sections.push(currentSection);
        }
      }

      // Start a new section
      currentSection = {
        title: headingTitle,
        content: '',
        startOffset: lineStart,
        endOffset: text.length,
      };
    }

    currentOffset = lineEnd + 1; // +1 for the newline
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = text.substring(currentSection.startOffset).trim();
    if (currentSection.content.length > 0) {
      sections.push(currentSection);
    }
  }

  // If no sections detected, treat entire text as one section
  if (sections.length === 0) {
    sections.push({
      title: 'Document',
      content: text.trim(),
      startOffset: 0,
      endOffset: text.length,
    });
  }

  return sections;
}

/**
 * Structure-aware chunking for books and long documents
 * Detects chapters/sections and chunks within them
 */
export function chunkDocument(
  text: string,
  options: {
    maxChunkSize?: number;
    overlapSize?: number;
    preserveSections?: boolean;
  } = {}
): TextChunk[] {
  const { maxChunkSize = 2000, overlapSize = 200, preserveSections = true } = options;

  if (!text || text.trim().length === 0) {
    return [];
  }

  // For short documents, use simple chunking
  if (text.length <= maxChunkSize) {
    return [
      {
        content: text.trim(),
        chunkIndex: 0,
        startOffset: 0,
        endOffset: text.length,
      },
    ];
  }

  const allChunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  if (preserveSections) {
    // Detect document structure
    const sections = detectSections(text);

    for (const section of sections) {
      // Chunk each section separately
      const sectionChunks = chunkText(section.content, {
        maxChunkSize,
        overlapSize,
      });

      // Add section context to each chunk
      for (const chunk of sectionChunks) {
        allChunks.push({
          content: chunk.content,
          chunkIndex: globalChunkIndex++,
          startOffset: section.startOffset + chunk.startOffset,
          endOffset: section.startOffset + chunk.endOffset,
          section: section.title,
        });
      }
    }
  } else {
    // Fall back to simple chunking with larger sizes
    return chunkText(text, { maxChunkSize, overlapSize });
  }

  return allChunks;
}
