import React, { useState } from 'react';
import { BiasWarningProps } from './types';

const BiasWarning: React.FC<BiasWarningProps> = ({ 
  message, 
  onDismiss,
  className = '' 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`bias-warning ${className}`}>
      <div className="warning-icon">
        ⚠️
      </div>
      
      <div className="warning-content">
        <div className="warning-title">
          Important Notice
        </div>
        <div className="warning-message">
          {message}
        </div>
        <div className="warning-disclaimer">
          Please verify this information with official sources and consult with qualified professionals before making important decisions.
        </div>
      </div>
      
      {onDismiss && (
        <button 
          onClick={handleDismiss}
          className="dismiss-button"
          aria-label="Dismiss warning"
        >
          ✕
        </button>
      )}

      <style>{`
        .bias-warning {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          margin: 16px 0;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-left: 4px solid #f39c12;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
        }

        .warning-icon {
          font-size: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .warning-content {
          flex: 1;
          min-width: 0;
        }

        .warning-title {
          font-weight: 600;
          color: #856404;
          margin-bottom: 4px;
        }

        .warning-message {
          color: #856404;
          margin-bottom: 8px;
        }

        .warning-disclaimer {
          font-size: 12px;
          color: #6c757d;
          font-style: italic;
        }

        .dismiss-button {
          background: none;
          border: none;
          color: #856404;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          flex-shrink: 0;
          font-size: 16px;
          line-height: 1;
        }

        .dismiss-button:hover {
          background: rgba(133, 100, 4, 0.1);
        }

        @media (max-width: 480px) {
          .bias-warning {
            padding: 12px;
            gap: 8px;
          }
          
          .warning-icon {
            font-size: 18px;
          }
          
          .bias-warning {
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default BiasWarning;