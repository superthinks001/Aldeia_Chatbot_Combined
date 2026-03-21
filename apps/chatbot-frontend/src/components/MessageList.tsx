import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import BiasWarning from './BiasWarning';
import EthicalAIIndicators from './EthicalAIIndicators';
import CorrectionBanner from './CorrectionBanner';
import { api } from '../utils/api';

export interface Message {
  sender: 'user' | 'bot' | 'docs' | 'system';
  text?: string;
  timestamp?: Date | string;
  confidence?: number;
  bias?: boolean;
  uncertainty?: boolean;
  hallucination?: boolean;
  grounded?: boolean;
  sources?: string[];
  matches?: { text: string; source: string; score: number; chunk_index: number; source_type?: string }[];
  isGreeting?: boolean;
  intent?: string;
  context?: any;
  isClarification?: boolean;

  // Feature 5: Source info for feedback
  source?: string;
  chunk_index?: number;

  // Sprint 2: Enhanced bias analysis
  biasAnalysis?: {
    detected: boolean;
    score: number;
    types: string[];
    severity: 'low' | 'medium' | 'high';
    corrected: boolean;
  };

  // Sprint 2: Fact-checking results
  hallucinationRisk?: number;
  factCheck?: {
    verified: boolean;
    reliability: 'high' | 'medium' | 'low' | 'unverified';
    sources: string[];
    conflicts?: any[];
    recommendations: string[];
  };

  // Sprint 2: Enhanced intent classification
  intentConfidence?: number;
  secondaryIntents?: string[];
  entities?: {
    location?: string;
    dateTime?: string;
    documentType?: string;
    topic?: string;
  };

  // Sprint 2/3: Human handoff
  handoffRequired?: boolean;
  handoffReason?: string;
  handoffPriority?: 'low' | 'medium' | 'high' | 'urgent';
  handoffMessage?: string;
  handoffContact?: {
    name: string;
    phone?: string;
    email?: string;
    hours?: string;
  };
  handoffExpert?: string;

  // Sprint 2/3: Proactive notifications
  notification?: {
    id: string;
    type: 'deadline' | 'update' | 'resource' | 'weather' | 'safety';
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    location?: string;
    actionUrl?: string;
    actionText?: string;
  };
  notifications?: any[];
}

interface MessageListProps {
  messages: Message[];
  history?: any[];
  isFullScreen?: boolean;
  conversationId?: string;
}

const MessageList: React.FC<MessageListProps> = ({ messages, history, isFullScreen, conversationId }) => {
  const [feedbackSubmitting, setFeedbackSubmitting] = useState<Set<number>>(new Set());
  const [flagSubmitting, setFlagSubmitting] = useState<Set<number>>(new Set());
  // Track which messages have received feedback: index -> 'positive' | 'negative'
  const [feedbackGiven, setFeedbackGiven] = useState<Map<number, 'positive' | 'negative'>>(new Map());
  // Track which messages have been flagged
  const [flagGiven, setFlagGiven] = useState<Set<number>>(new Set());

  const handleFeedback = async (messageIndex: number, helpful: boolean) => {
    const msg = messages[messageIndex];
    if (!msg || msg.sender !== 'bot') return;

    setFeedbackSubmitting(prev => new Set([...prev, messageIndex]));
    try {
      await api.request({
        method: 'POST',
        url: '/chat/feedback',
        data: {
          messageId: messageIndex,
          conversationId,
          helpful,
          messageText: msg.text,
          confidence: msg.confidence,
          timestamp: new Date().toISOString(),
          source: msg.source,
          chunk_index: msg.chunk_index
        }
      });
      setFeedbackGiven(prev => new Map(prev).set(messageIndex, helpful ? 'positive' : 'negative'));
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setFeedbackSubmitting(prev => {
        const next = new Set(prev);
        next.delete(messageIndex);
        return next;
      });
    }
  };

  const handleFlag = async (messageIndex: number, reason: string) => {
    const msg = messages[messageIndex];
    if (!msg || msg.sender !== 'bot') return;

    setFlagSubmitting(prev => new Set([...prev, messageIndex]));
    try {
      await api.request({
        method: 'POST',
        url: '/chat/flag-response',
        data: {
          messageId: messageIndex,
          conversationId,
          reason,
          messageText: msg.text,
          confidence: msg.confidence,
          timestamp: new Date().toISOString(),
          source: msg.source,
          chunk_index: msg.chunk_index
        }
      });
      setFlagGiven(prev => new Set(prev).add(messageIndex));
    } catch (error) {
      console.error('Failed to flag response:', error);
      alert('Failed to flag response. Please try again.');
    } finally {
      setFlagSubmitting(prev => {
        const next = new Set(prev);
        next.delete(messageIndex);
        return next;
      });
    }
  };

  // Convert chunk_index to page/paragraph estimate
  const getPDFLocation = (chunkIndex: number, source: string): string => {
    // Estimate: ~5 chunks per page, ~2 chunks per paragraph
    const estimatedPage = Math.floor(chunkIndex / 5) + 1;
    const paragraphInPage = Math.floor((chunkIndex % 5) / 2) + 1;
    return `Page ${estimatedPage}, Paragraph ${paragraphInPage}`;
  };

  return (
  <div
    style={{ 
      height: '100%',
      overflowY: 'auto', 
      padding: 8 
    }}
    aria-live="polite"
    role="log"
  >
    {messages.map((msg, idx) => (
      <div key={idx} style={{
        marginBottom: 12,
        textAlign: msg.sender === 'user' ? 'right' : msg.sender === 'system' ? 'center' : 'left',
      }}>
        {/* System messages (Feature 2/3) */}
        {msg.sender === 'system' ? (
          <div style={{
            display: 'inline-block',
            background: '#f0f0f0',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            color: '#666',
            fontStyle: 'italic',
            border: '1px solid #e0e0e0'
          }}>
            {msg.text}
          </div>
        ) : msg.sender === 'docs' && msg.matches ? (
          <div style={{
            background: '#fffde7',
            border: '1px solid #ffe082',
            borderRadius: 8,
            padding: '8px 12px',
            maxWidth: isFullScreen ? '100%' : 320,
            margin: '0 auto',
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Relevant Documents:</div>
            {(() => {
              // Filter out duplicate source+chunk_index
              const seen = new Set<string>();
              const uniqueMatches = msg.matches.filter(match => {
                const key = `${match.source}_${match.chunk_index}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return uniqueMatches.map((match, i) => {
                let folder = '';
                if (match.source.toLowerCase().includes('pasadena')) {
                  folder = 'Pasadena County';
                } else {
                  folder = 'LA County';
                }
                const pdfUrl = `/${folder}/${encodeURIComponent(match.source)}`;
                return (
                  <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1976d2', textDecoration: 'underline', cursor: 'pointer' }}
                    >
                      {match.text.length > 220 ? match.text.slice(0, 220) + '...' : match.text}
                    </a>
                    <div style={{ color: '#764ba2', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                      Source: {match.source}
                      {match.chunk_index !== undefined && (
                        <span style={{ color: '#1976d2' }}>
                          ({getPDFLocation(match.chunk_index, match.source)})
                        </span>
                      )}
                      {match.source_type === 'user_upload' && (
                        <span style={{
                          padding: '1px 6px',
                          backgroundColor: '#4caf50',
                          color: 'white',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 600
                        }}>Uploaded</span>
                      )}
                      {match.source_type === 'scraped_url' && (
                        <span style={{
                          padding: '1px 6px',
                          backgroundColor: '#2196f3',
                          color: 'white',
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: 600
                        }}>Web</span>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div style={{
            display: 'inline-block',
            background: msg.sender === 'user' 
              ? '#e3f2fd' 
              : msg.isGreeting 
                ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                : '#f8f9fa',
            borderRadius: 12,
            padding: msg.isGreeting ? '16px 20px' : '8px 12px',
            minWidth: 60,
            maxWidth: isFullScreen ? '100%' : 300,
            wordBreak: 'break-word',
            border: msg.isGreeting ? '2px solid #667eea' : '1px solid #e0e0e0',
            boxShadow: msg.isGreeting ? '0 4px 12px rgba(102, 126, 234, 0.15)' : '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {/* AI Disclosure - Prominent on every bot response */}
            {msg.sender === 'bot' && !msg.isGreeting && (
              <div style={{
                fontSize: 10,
                color: '#666',
                fontStyle: 'italic',
                marginBottom: 8,
                padding: '4px 8px',
                backgroundColor: '#f5f5f5',
                borderRadius: 4,
                borderLeft: '3px solid #667eea'
              }}>
                🤖 This answer was generated by AI. Please verify important information with official sources.
              </div>
            )}
            
            <div style={{
              fontSize: msg.isGreeting ? 14 : 13,
              lineHeight: 1.4,
              color: msg.isGreeting ? '#2c3e50' : '#333'
            }}>
              {msg.sender === 'bot' && !msg.isGreeting ? (
                <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>
            {/* Multi-turn context badge */}
            {msg.sender === 'bot' && msg.context && msg.context.history && msg.context.history.length > 1 && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#764ba2', fontWeight: 500 }}>
                Contextual answer (multi-turn)
              </div>
            )}
            {/* Admin/debug: show last few turns of history */}
            {msg.sender === 'bot' && msg.context && msg.context.history && (
              <details style={{ marginTop: 4, fontSize: 11, color: '#333' }}>
                <summary>Show conversation history</summary>
                <ul style={{ paddingLeft: 16 }}>
                  {msg.context.history.slice(-3).map((turn: any, i: number) => (
                    <li key={i}><b>{turn.sender}:</b> {turn.text}</li>
                  ))}
                </ul>
              </details>
            )}
            {/* Ethical AI Indicators for bot messages */}
            {msg.sender === 'bot' && !msg.isGreeting && (
              <EthicalAIIndicators
                confidence={msg.confidence}
                bias={msg.bias}
                uncertainty={msg.uncertainty}
                hallucination={msg.hallucination}
                grounded={msg.grounded}
                sources={msg.sources}
                size="small"
                showDetails={false}
              />
            )}

            {/* Correction Banner */}
            {msg.sender === 'bot' && !msg.isGreeting && (
              <CorrectionBanner
                messageId={`msg_${idx}`}
                originalText={msg.text || ''}
              />
            )}

            {/* Feedback and Flag Buttons for bot messages */}
            {msg.sender === 'bot' && !msg.isGreeting && (
              <div style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid #e0e0e0',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap'
              }}>
                {/* Show confirmation or buttons */}
                {feedbackGiven.has(idx) ? (
                  <span style={{
                    fontSize: 11,
                    color: feedbackGiven.get(idx) === 'positive' ? '#2e7d32' : '#e65100',
                    fontWeight: 500,
                    padding: '4px 8px',
                    backgroundColor: feedbackGiven.get(idx) === 'positive' ? '#e8f5e9' : '#fff3e0',
                    borderRadius: 4
                  }}>
                    {feedbackGiven.get(idx) === 'positive'
                      ? '✓ Thanks for the positive feedback!'
                      : '✓ Thanks for your feedback. We\'ll work to improve.'}
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11, color: '#666', marginRight: 4 }}>Was this helpful?</span>
                    <button
                      onClick={() => handleFeedback(idx, true)}
                      disabled={feedbackSubmitting.has(idx)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 11,
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: feedbackSubmitting.has(idx) ? 'not-allowed' : 'pointer',
                        opacity: feedbackSubmitting.has(idx) ? 0.6 : 1,
                        fontWeight: 500
                      }}
                      title="Mark as helpful"
                    >
                      {feedbackSubmitting.has(idx) ? '...' : '✓ Yes'}
                    </button>
                    <button
                      onClick={() => handleFeedback(idx, false)}
                      disabled={feedbackSubmitting.has(idx)}
                      style={{
                        padding: '4px 12px',
                        fontSize: 11,
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: 4,
                        cursor: feedbackSubmitting.has(idx) ? 'not-allowed' : 'pointer',
                        opacity: feedbackSubmitting.has(idx) ? 0.6 : 1,
                        fontWeight: 500
                      }}
                      title="Mark as not helpful"
                    >
                      {feedbackSubmitting.has(idx) ? '...' : '✗ No'}
                    </button>
                  </div>
                )}

                {/* Flag Response Button — show confirmation or button */}
                {flagGiven.has(idx) ? (
                  <span style={{
                    fontSize: 11,
                    color: '#ad1457',
                    fontWeight: 500,
                    padding: '4px 8px',
                    backgroundColor: '#fce4ec',
                    borderRadius: 4
                  }}>
                    🚩 Flagged for review
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      const reason = prompt('Please tell us why you are flagging this response (incorrect, harmful, inappropriate, etc.):');
                      if (reason) {
                        handleFlag(idx, reason);
                      }
                    }}
                    disabled={flagSubmitting.has(idx) || feedbackGiven.has(idx)}
                    style={{
                      padding: '4px 12px',
                      fontSize: 11,
                      backgroundColor: 'transparent',
                      color: '#f44336',
                      border: '1px solid #f44336',
                      borderRadius: 4,
                      cursor: (flagSubmitting.has(idx) || feedbackGiven.has(idx)) ? 'not-allowed' : 'pointer',
                      opacity: (flagSubmitting.has(idx) || feedbackGiven.has(idx)) ? 0.6 : 1,
                      fontWeight: 500
                    }}
                    title="Flag this response as incorrect or harmful"
                  >
                    {flagSubmitting.has(idx) ? '...' : '🚩 Flag'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    ))}
  </div>
  );
};

export default MessageList;
