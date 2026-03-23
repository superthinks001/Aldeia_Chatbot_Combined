import React, { useState } from 'react';
import './EthicalAIIndicators.css';

/* ------------------------------------------------------------------ */
/* Custom Tooltip Component                                            */
/* ------------------------------------------------------------------ */

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ text, children }) => {
  const [visible, setVisible] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const handleMouseEnter = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const tooltipWidth = 280;
      // Center horizontally over the badge, clamped to viewport
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
      // Position above the badge
      const top = rect.top - 8;
      setPos({ top, left });
    }
    setVisible(true);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translateY(-100%)',
          backgroundColor: '#1a1a2e',
          color: '#f0f0f0',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.5,
          width: 280,
          whiteSpace: 'normal',
          zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          pointerEvents: 'none'
        }}>
          {text}
          {/* Arrow pointing down */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: containerRef.current
              ? Math.max(12, Math.min(
                  containerRef.current.getBoundingClientRect().left +
                  containerRef.current.getBoundingClientRect().width / 2 - pos.left,
                  268
                ))
              : '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1a1a2e'
          } as React.CSSProperties} />
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Tooltip Text Constants                                              */
/* ------------------------------------------------------------------ */

function getConfidenceTooltip(percent: number): string {
  if (percent >= 90) return `Confidence: ${percent.toFixed(0)}% (Very High). The answer closely matches verified recovery documents. You can rely on this information.`;
  if (percent >= 75) return `Confidence: ${percent.toFixed(0)}% (High). Good match with recovery documents. Minor details may benefit from verification.`;
  if (percent >= 60) return `Confidence: ${percent.toFixed(0)}% (Medium). Partial match found. Consider verifying key details with official county resources.`;
  if (percent >= 40) return `Confidence: ${percent.toFixed(0)}% (Low). Limited matching information found. We recommend checking official sources before acting on this.`;
  return `Confidence: ${percent.toFixed(0)}% (Very Low). Very little matching information. Please verify with official sources — this may not be accurate.`;
}

const UNCERTAINTY_TOOLTIP = 'This response has low confidence or could not be fully verified against source documents. Please verify the information with official county resources before taking action.';

const BIAS_TOOLTIP = 'Potential bias detected in the source language or framing. The AI flagged patterns that may reflect assumptions. Consider consulting multiple perspectives and official sources.';

const VERIFIED_TOOLTIP = 'This response is grounded in verified recovery documents. The facts have been cross-referenced with the source materials in our knowledge base.';

const UNVERIFIED_TOOLTIP = 'This response may contain information that could not be fully verified against our document sources. There is a higher risk of inaccuracies — please cross-check with official resources.';

/* ------------------------------------------------------------------ */
/* Main Component                                                      */
/* ------------------------------------------------------------------ */

interface EthicalAIIndicatorsProps {
  confidence?: number; // 0-1 or 0-100
  bias?: boolean;
  uncertainty?: boolean;
  hallucination?: boolean;
  grounded?: boolean;
  sources?: string[];
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
}

const EthicalAIIndicators: React.FC<EthicalAIIndicatorsProps> = ({
  confidence,
  bias,
  uncertainty,
  hallucination,
  grounded = true,
  sources = [],
  size = 'medium',
  showDetails = false
}) => {
  const [expanded, setExpanded] = useState(false);

  // Normalize confidence to 0-100 scale
  const confidencePercent = confidence !== undefined
    ? (confidence > 1 ? confidence : confidence * 100)
    : undefined;

  // Determine confidence level and color
  const getConfidenceLevel = (conf: number | undefined): { level: string; color: string; bgColor: string } => {
    if (conf === undefined) return { level: 'Unknown', color: '#757575', bgColor: '#f5f5f5' };
    if (conf >= 90) return { level: 'Very High', color: '#2e7d32', bgColor: '#e8f5e9' };
    if (conf >= 75) return { level: 'High', color: '#388e3c', bgColor: '#f1f8f4' };
    if (conf >= 60) return { level: 'Medium', color: '#f57c00', bgColor: '#fff3e0' };
    if (conf >= 40) return { level: 'Low', color: '#e65100', bgColor: '#fbe9e7' };
    return { level: 'Very Low', color: '#c62828', bgColor: '#ffebee' };
  };

  const confLevel = getConfidenceLevel(confidencePercent);

  const sizeMap = {
    small: { fontSize: 10, iconSize: 12, padding: '2px 6px' },
    medium: { fontSize: 12, iconSize: 14, padding: '4px 8px' },
    large: { fontSize: 14, iconSize: 16, padding: '6px 12px' }
  };

  const styles = sizeMap[size];

  if (!confidence && !bias && !uncertainty && !hallucination && sources.length === 0) {
    return null;
  }

  return (
    <div className={`ethical-ai-indicators ${size}`}>
      <div className="indicators-row">
        {/* Confidence Score */}
        {confidencePercent !== undefined && (
          <Tooltip text={getConfidenceTooltip(confidencePercent)}>
            <div
              className="indicator confidence-indicator"
              style={{
                backgroundColor: confLevel.bgColor,
                color: confLevel.color,
                fontSize: styles.fontSize,
                padding: styles.padding
              }}
            >
              <span className="indicator-icon">📊</span>
              <span className="indicator-text">
                {confidencePercent.toFixed(0)}% {showDetails && `(${confLevel.level})`}
              </span>
            </div>
          </Tooltip>
        )}

        {/* Bias Warning */}
        {bias && (
          <Tooltip text={BIAS_TOOLTIP}>
            <div
              className="indicator bias-indicator"
              style={{
                backgroundColor: '#fff3e0',
                color: '#e65100',
                fontSize: styles.fontSize,
                padding: styles.padding
              }}
            >
              <span className="indicator-icon">⚠️</span>
              <span className="indicator-text">Bias Detected</span>
            </div>
          </Tooltip>
        )}

        {/* Uncertainty Warning */}
        {uncertainty && (
          <Tooltip text={UNCERTAINTY_TOOLTIP}>
            <div
              className="indicator uncertainty-indicator"
              style={{
                backgroundColor: '#ffebee',
                color: '#c62828',
                fontSize: styles.fontSize,
                padding: styles.padding
              }}
            >
              <span className="indicator-icon">❓</span>
              <span className="indicator-text">Uncertain</span>
            </div>
          </Tooltip>
        )}

        {/* Hallucination Warning */}
        {hallucination && (
          <Tooltip text={UNVERIFIED_TOOLTIP}>
            <div
              className="indicator hallucination-indicator"
              style={{
                backgroundColor: '#fce4ec',
                color: '#ad1457',
                fontSize: styles.fontSize,
                padding: styles.padding
              }}
            >
              <span className="indicator-icon">🚨</span>
              <span className="indicator-text">Unverified</span>
            </div>
          </Tooltip>
        )}

        {/* Grounded Badge */}
        {grounded && sources.length > 0 && (
          <Tooltip text={VERIFIED_TOOLTIP}>
            <div
              className="indicator grounded-indicator"
              style={{
                backgroundColor: '#e8f5e9',
                color: '#2e7d32',
                fontSize: styles.fontSize,
                padding: styles.padding
              }}
            >
              <span className="indicator-icon">✓</span>
              <span className="indicator-text">Verified</span>
            </div>
          </Tooltip>
        )}

        {/* Show Details Toggle */}
        {(sources.length > 0 || showDetails) && (
          <button
            className="details-toggle"
            onClick={() => setExpanded(!expanded)}
            style={{
              fontSize: styles.fontSize,
              padding: styles.padding
            }}
            title="Show more information"
          >
            {expanded ? '▲' : '▼'} How did you get this answer?
          </button>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="indicators-details" style={{ fontSize: styles.fontSize }}>
          {confidencePercent !== undefined && (
            <div className="detail-item">
              <strong>Confidence Explanation:</strong>
              <p>
                This response has a confidence score of <strong>{confidencePercent.toFixed(1)}%</strong>.
                {confidencePercent >= 75 && " This indicates high reliability based on available sources."}
                {confidencePercent >= 60 && confidencePercent < 75 && " Please verify this information with official sources."}
                {confidencePercent < 60 && " This information should be verified before making decisions."}
              </p>
            </div>
          )}

          {bias && (
            <div className="detail-item warning">
              <strong>⚠️ Bias Warning:</strong>
              <p>
                This response may contain biased language or assumptions. We recommend considering
                multiple perspectives and consulting official sources for balanced information.
              </p>
            </div>
          )}

          {uncertainty && (
            <div className="detail-item warning">
              <strong>❓ Uncertainty Notice:</strong>
              <p>
                The AI is not confident about this response. Please verify this information with
                authoritative sources before taking action.
              </p>
            </div>
          )}

          {hallucination && (
            <div className="detail-item warning">
              <strong>🚨 Verification Required:</strong>
              <p>
                This response may contain unverified or fabricated information. Always cross-check
                with official county resources and documentation.
              </p>
            </div>
          )}

          {sources.length > 0 && (
            <div className="detail-item">
              <strong>Sources ({sources.length}):</strong>
              <ul>
                {sources.slice(0, 3).map((source, idx) => (
                  <li key={idx}>{source}</li>
                ))}
                {sources.length > 3 && <li>...and {sources.length - 3} more</li>}
              </ul>
            </div>
          )}

          <div className="detail-item info">
            <strong>ℹ️ How to Use This Information:</strong>
            <p>
              These indicators help you understand the reliability of AI responses. Always:
              <ul>
                <li>Verify important information with official sources</li>
                <li>Consider multiple perspectives</li>
                <li>Contact authorities for critical decisions</li>
              </ul>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EthicalAIIndicators;
