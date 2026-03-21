/**
 * Feedback Weight Service
 *
 * Records per-chunk feedback and computes weights that adjust
 * future retrieval rankings. Creates a community learning effect.
 */

import NodeCache from 'node-cache';
import { supabase } from '../config/database';

const weightCache = new NodeCache({ stdTTL: 300 }); // 5-minute TTL

export interface ChunkFeedbackInput {
  chunkId: string;
  source: string;
  chunkIndex: number;
  feedbackType: 'helpful' | 'not_helpful' | 'flagged';
  userId?: number;
  conversationId?: string;
  messageText?: string;
  reason?: string;
}

/**
 * Record feedback for a specific chunk
 */
export async function recordChunkFeedback(data: ChunkFeedbackInput): Promise<void> {
  try {
    const { error } = await supabase
      .from('chunk_feedback')
      .insert([{
        chunk_id: data.chunkId,
        source: data.source,
        chunk_index: data.chunkIndex,
        feedback_type: data.feedbackType,
        user_id: data.userId || null,
        conversation_id: data.conversationId || null,
        message_text: data.messageText || null,
        reason: data.reason || null
      }]);

    if (error) {
      console.error('Failed to record chunk feedback:', error);
      throw error;
    }

    // Invalidate cache for this chunk
    weightCache.del(`weight_${data.chunkId}`);
    weightCache.del('bulk_weights');
  } catch (err) {
    console.error('Error recording chunk feedback:', err);
    // Don't throw - feedback recording should not break the main flow
  }
}

/**
 * Get weights for a list of chunk IDs.
 * Weight formula: 1.0 + (helpful * 0.1) - (not_helpful * 0.15) - (flagged * 0.3)
 * Clamped to [0.2, 2.0]
 */
export async function getChunkWeights(chunkIds: string[]): Promise<Map<string, number>> {
  const weights = new Map<string, number>();

  if (!chunkIds.length) return weights;

  // Set default weight of 1.0 for all chunks
  for (const id of chunkIds) {
    weights.set(id, 1.0);
  }

  // Check cache first
  const cacheKey = `weights_${chunkIds.sort().join(',')}`;
  const cached = weightCache.get<Map<string, number>>(cacheKey);
  if (cached) return cached;

  try {
    // Query feedback aggregates for all chunk IDs
    const { data, error } = await supabase
      .from('chunk_feedback')
      .select('chunk_id, feedback_type')
      .in('chunk_id', chunkIds);

    if (error) {
      console.error('Failed to fetch chunk feedback:', error);
      return weights;
    }

    if (!data || data.length === 0) return weights;

    // Aggregate feedback per chunk
    const aggregates = new Map<string, { helpful: number; not_helpful: number; flagged: number }>();
    for (const row of data) {
      if (!aggregates.has(row.chunk_id)) {
        aggregates.set(row.chunk_id, { helpful: 0, not_helpful: 0, flagged: 0 });
      }
      const agg = aggregates.get(row.chunk_id)!;
      if (row.feedback_type === 'helpful') agg.helpful++;
      else if (row.feedback_type === 'not_helpful') agg.not_helpful++;
      else if (row.feedback_type === 'flagged') agg.flagged++;
    }

    // Calculate weights
    for (const [chunkId, agg] of aggregates) {
      const weight = 1.0 + (agg.helpful * 0.1) - (agg.not_helpful * 0.15) - (agg.flagged * 0.3);
      const clampedWeight = Math.max(0.2, Math.min(2.0, weight));
      weights.set(chunkId, clampedWeight);
    }

    // Cache results
    weightCache.set(cacheKey, weights);
  } catch (err) {
    console.error('Error fetching chunk weights:', err);
  }

  return weights;
}

/**
 * Build a chunk ID from source and chunk_index for consistent identification
 */
export function buildChunkId(source: string, chunkIndex: number): string {
  return `${source}::${chunkIndex}`;
}
