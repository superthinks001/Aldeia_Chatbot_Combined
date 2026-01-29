import React from 'react';
import { ConfidenceBadgeProps } from './types';

const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ 
  confidence, 
  className = '' 
}) => {
  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    return 'low';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.9) return 'Very confident';
    if (score >= 0.8) return 'Confident';
    if (score >= 0.6) return 'Moderate';
    if (score >= 0.4) return 'Low confidence';
    return 'Very low';
  };

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return '#28a745';
      case 'medium': return '#ffc107';
      case 'low': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const level = getConfidenceLevel(confidence);
  const text = getConfidenceText(confidence);
  const color = getConfidenceColor(level);

  return (
    <span 
      className={`confidence-badge ${level} ${className}`}
      title={`Confidence: ${Math.round(confidence * 100)}% - ${text}`}
    >
      {Math.round(confidence * 100)}%
      
      <style>{`
        .confidence-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          background-color: ${color};
          color: white;
          white-space: nowrap;
          cursor: help;
        }

        .confidence-badge.high {
          background-color: #28a745;
        }

        .confidence-badge.medium {
          background-color: #ffc107;
          color: #000;
        }

        .confidence-badge.low {
          background-color: #dc3545;
        }

        .confidence-badge:hover {
          opacity: 0.8;
        }
      `}</style>
    </span>
  );
};

export default ConfidenceBadge;