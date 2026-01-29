import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import './CorrectionBanner.css';

interface Correction {
  id: string;
  originalText: string;
  correctedText: string;
  reason: string;
  deployedAt: Date;
}

interface CorrectionBannerProps {
  messageId: string;
  originalText: string;
}

const CorrectionBanner: React.FC<CorrectionBannerProps> = ({ messageId, originalText }) => {
  const [correction, setCorrection] = useState<Correction | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);

  useEffect(() => {
    fetchCorrection();
  }, [messageId]);

  const fetchCorrection = async () => {
    setLoading(true);
    try {
      const response = await api.request({
        method: 'GET',
        url: `/chat/corrections/${messageId}`
      });
      if (response.data.corrections && response.data.corrections.length > 0) {
        setCorrection(response.data.corrections[0]);
      }
    } catch (error) {
      // No correction found or error - silently fail
    } finally {
      setLoading(false);
    }
  };

  if (!correction) {
    return null;
  }

  return (
    <div className="correction-banner">
      <div style={{
        padding: '12px 16px',
        backgroundColor: '#e8f5e9',
        borderLeft: '4px solid #2e7d32',
        borderRadius: 4,
        marginTop: 8,
        fontSize: 12
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8
        }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontWeight: 600,
              color: '#2e7d32',
              marginBottom: 4
            }}>
              Updated guidance based on recent data
            </div>
            <div style={{ color: '#333', lineHeight: 1.4 }}>
              This response has been corrected. {!showCorrection && (
                <button
                  onClick={() => setShowCorrection(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2e7d32',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: 4,
                    fontSize: 12
                  }}
                >
                  View correction
                </button>
              )}
            </div>
          </div>
        </div>

        {showCorrection && (
          <div style={{
            marginTop: 8,
            padding: '10px',
            backgroundColor: 'white',
            borderRadius: 4,
            border: '1px solid #c8e6c9'
          }}>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                Original Response:
              </div>
              <div style={{
                padding: '6px 10px',
                backgroundColor: '#ffebee',
                borderRadius: 4,
                fontSize: 11,
                color: '#c62828',
                textDecoration: 'line-through'
              }}>
                {correction.originalText}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>
                Corrected Response:
              </div>
              <div style={{
                padding: '6px 10px',
                backgroundColor: '#e8f5e9',
                borderRadius: 4,
                fontSize: 11,
                color: '#2e7d32',
                fontWeight: 500
              }}>
                {correction.correctedText}
              </div>
            </div>
            <div style={{
              marginTop: 8,
              fontSize: 10,
              color: '#666',
              fontStyle: 'italic'
            }}>
              Reason: {correction.reason} • Updated: {new Date(correction.deployedAt).toLocaleDateString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CorrectionBanner;
