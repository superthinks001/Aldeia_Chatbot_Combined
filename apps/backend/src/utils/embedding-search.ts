/**
 * Embedding Search Utilities
 *
 * Provides cosine similarity search for locally embedded chunks
 * (from user uploads and scraped URLs) and merging with ChromaDB results.
 */

export interface SearchMatch {
  text: string;
  source: string;
  chunkIndex: number;
  distance: number;
  sourceType: 'main' | 'user_upload' | 'scraped_url';
  metadata?: Record<string, any>;
}

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Convert cosine similarity (0-1, higher=better) to distance (0-2, lower=better)
 * to match ChromaDB's distance format
 */
function similarityToDistance(similarity: number): number {
  return Math.max(0, 1 - similarity) * 2;
}

/**
 * Search locally embedded chunks by cosine similarity
 */
export function searchLocalEmbeddings(
  queryEmbedding: number[],
  chunks: Array<{
    text: string;
    embedding: number[];
    source: string;
    sourceType: 'user_upload' | 'scraped_url';
    chunkIndex: number;
    metadata?: Record<string, any>;
  }>,
  topK: number = 3
): SearchMatch[] {
  if (!chunks.length) return [];

  const scored = chunks.map(chunk => ({
    text: chunk.text,
    source: chunk.source,
    chunkIndex: chunk.chunkIndex,
    distance: similarityToDistance(cosineSimilarity(queryEmbedding, chunk.embedding)),
    sourceType: chunk.sourceType as 'user_upload' | 'scraped_url',
    metadata: chunk.metadata
  }));

  // Sort by distance (lower = better match)
  scored.sort((a, b) => a.distance - b.distance);

  return scored.slice(0, topK);
}

/**
 * Merge ChromaDB results with local search results, sorted by distance
 */
export function mergeSearchResults(
  chromaResults: SearchMatch[],
  localResults: SearchMatch[],
  topK: number = 5
): SearchMatch[] {
  const combined = [...chromaResults, ...localResults];
  combined.sort((a, b) => a.distance - b.distance);
  return combined.slice(0, topK);
}
