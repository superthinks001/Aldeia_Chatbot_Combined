/**
 * Correction Deployment Service
 * 
 * Manages visible corrections to flagged or incorrect responses
 */

import { supabase } from '../config/database';
import { logAuditEvent, AuditEventType, AuditSeverity } from './audit-trail.service';

export interface Correction {
  id: string;
  originalMessageId: string;
  originalText: string;
  correctedText: string;
  reason: string;
  flaggedBy?: number;
  reviewedBy?: number;
  deployedAt: Date;
  visible: boolean;
  metadata?: any;
}

/**
 * Deploy a visible correction to a flagged response
 */
export async function deployCorrection(data: {
  originalMessageId: string;
  originalText: string;
  correctedText: string;
  reason: string;
  flaggedBy?: number;
  reviewedBy?: number;
  metadata?: any;
}): Promise<Correction> {
  const correction: Correction = {
    id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalMessageId: data.originalMessageId,
    originalText: data.originalText,
    correctedText: data.correctedText,
    reason: data.reason,
    flaggedBy: data.flaggedBy,
    reviewedBy: data.reviewedBy,
    deployedAt: new Date(),
    visible: true,
    metadata: data.metadata
  };

  // Store correction in database
  const { error } = await supabase
    .from('corrections')
    .insert([{
      id: correction.id,
      original_message_id: correction.originalMessageId,
      original_text: correction.originalText,
      corrected_text: correction.correctedText,
      reason: correction.reason,
      flagged_by: correction.flaggedBy,
      reviewed_by: correction.reviewedBy,
      deployed_at: correction.deployedAt.toISOString(),
      visible: correction.visible,
      metadata: correction.metadata ? JSON.stringify(correction.metadata) : null
    }]);

  if (error) {
    console.error('Failed to store correction:', error);
    throw error;
  }

  // Log correction deployment
  await logAuditEvent({
    eventType: AuditEventType.CONFIG_CHANGED,
    severity: AuditSeverity.INFO,
    userId: data.reviewedBy,
    message: `Correction deployed for message ${data.originalMessageId}`,
    details: {
      correctionId: correction.id,
      originalText: data.originalText,
      correctedText: data.correctedText,
      reason: data.reason
    },
    userImpact: 'high'
  });

  return correction;
}

/**
 * Get visible corrections for a message
 */
export async function getCorrections(messageId: string): Promise<Correction[]> {
  const { data, error } = await supabase
    .from('corrections')
    .select('*')
    .eq('original_message_id', messageId)
    .eq('visible', true)
    .order('deployed_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch corrections:', error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    originalMessageId: row.original_message_id,
    originalText: row.original_text,
    correctedText: row.corrected_text,
    reason: row.reason,
    flaggedBy: row.flagged_by,
    reviewedBy: row.reviewed_by,
    deployedAt: new Date(row.deployed_at),
    visible: row.visible,
    metadata: row.metadata ? JSON.parse(row.metadata) : null
  }));
}

/**
 * Get all pending corrections requiring review
 */
export async function getPendingCorrections(): Promise<any[]> {
  const { data, error } = await supabase
    .from('audit_trail')
    .select('*')
    .eq('event_type', AuditEventType.WARNING_TRIGGERED)
    .eq('review_required', true)
    .is('reviewed_at', null)
    .order('timestamp', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Failed to fetch pending corrections:', error);
    return [];
  }

  return data || [];
}
