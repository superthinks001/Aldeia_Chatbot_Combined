import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './ConfidenceScoreViewer.css';

interface ConfidenceScore {
  id: string;
  timestamp: Date;
  confidence: number;
  messageText: string;
  intent?: string;
  sources?: string[];
}

interface ConfidenceScoreViewerProps {
  conversationId?: string;
  userId?: number | string;
}

const ConfidenceScoreViewer: React.FC<ConfidenceScoreViewerProps> = ({ conversationId, userId }) => {
  const [scores, setScores] = useState<ConfidenceScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expanded && (conversationId || userId)) {
      fetchScores();
    }
  }, [expanded, conversationId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchScores = async () => {
    setLoading(true);
    try {
      const response = await api.request({
        method: 'GET',
        url: '/chat/confidence-scores',
        params: {
          conversationId,
          userId: typeof userId === 'string' ? parseInt(userId, 10) : userId
        }
      });
      setScores(response.data.scores || []);
    } catch (error) {
      console.error('Failed to fetch confidence scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.75) return '#2e7d32';
    if (confidence >= 0.60) return '#f57c00';
    return '#c62828';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.75) return 'High';
    if (confidence >= 0.60) return 'Medium';
    return 'Low';
  };

  if (!expanded) {
    return (
      <div style={{
        padding: '6px 12px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        fontSize: 11
      }}>
        <button
          onClick={() => setExpanded(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#667eea',
            textDecoration: 'underline',
            fontSize: 11,
            padding: 0
          }}
        >
          View Confidence Score History
        </button>
      </div>
    );
  }

  return (
    <div className="confidence-score-viewer">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderTop: '1px solid #e0e0e0',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#2c3e50' }}>
          📊 Confidence Score History
        </div>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            color: '#666',
            padding: '2px 6px'
          }}
          title="Close"
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            Loading scores...
          </div>
        ) : scores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: 12 }}>
            No confidence scores found for this conversation.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scores.map((score, idx) => (
              <div
                key={score.id || idx}
                style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e0e0e0',
                  borderRadius: 6,
                  fontSize: 12
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6
                }}>
                  <div style={{
                    padding: '4px 10px',
                    backgroundColor: getConfidenceColor(score.confidence),
                    color: 'white',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {getConfidenceLabel(score.confidence)}: {(score.confidence * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: '#666' }}>
                    {new Date(score.timestamp).toLocaleString()}
                  </div>
                </div>
                <div style={{
                  fontSize: 11,
                  color: '#333',
                  marginBottom: 4,
                  lineHeight: 1.4
                }}>
                  {score.messageText.length > 100
                    ? score.messageText.slice(0, 100) + '...'
                    : score.messageText}
                </div>
                {score.intent && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                    Intent: {score.intent}
                  </div>
                )}
                {score.sources && score.sources.length > 0 && (
                  <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>
                    Sources: {score.sources.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfidenceScoreViewer;
