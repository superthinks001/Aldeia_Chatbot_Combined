import React from 'react';
import { MessageListProps } from './types';
import ConfidenceBadge from './ConfidenceBadge';
import { dateUtils } from '@aldeia/utils';

const MessageList: React.FC<MessageListProps> = ({ messages, className = '' }) => {
  if (messages.length === 0) {
    return (
      <div className={`message-list ${className}`}>
        <div className="empty-state">
          <p>👋 Hello! I'm here to help you with your wildfire rebuild questions.</p>
          <p>Ask me about permits, timelines, insurance, costs, or fire-resistant designs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-list ${className}`}>
      {messages.map((message) => (
        <div key={message.id} className={`message ${message.role}`}>
          <div className="message-content">
            <div className="message-text">
              {message.content}
            </div>
            
            <div className="message-meta">
              <span className="message-time">
                {dateUtils.formatRelative(message.timestamp)}
              </span>
              
              {message.role === 'assistant' && message.confidence !== undefined && (
                <ConfidenceBadge 
                  confidence={message.confidence} 
                  className="message-confidence"
                />
              )}
            </div>
          </div>
          
          {message.role === 'assistant' && (
            <div className="message-avatar">
              🤖
            </div>
          )}
          
          {message.role === 'user' && (
            <div className="message-avatar user-avatar">
              👤
            </div>
          )}
        </div>
      ))}

      <style>{`
        .message-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #6c757d;
        }

        .empty-state p {
          margin: 8px 0;
          line-height: 1.5;
        }

        .message {
          display: flex;
          gap: 12px;
          max-width: 85%;
        }

        .message.user {
          flex-direction: row-reverse;
          align-self: flex-end;
        }

        .message.assistant {
          flex-direction: row;
          align-self: flex-start;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          background: #f8f9fa;
          flex-shrink: 0;
        }

        .user-avatar {
          background: #007bff;
          color: white;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-text {
          padding: 12px 16px;
          border-radius: 18px;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .message.user .message-text {
          background: #007bff;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .message.assistant .message-text {
          background: #f8f9fa;
          color: #333;
          border: 1px solid #e9ecef;
          border-bottom-left-radius: 4px;
        }

        .message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          padding: 0 4px;
        }

        .message.user .message-meta {
          justify-content: flex-end;
        }

        .message.assistant .message-meta {
          justify-content: flex-start;
        }

        .message-time {
          font-size: 12px;
          color: #6c757d;
        }

        .message-confidence {
          font-size: 11px;
        }

        @media (max-width: 480px) {
          .message {
            max-width: 95%;
          }
          
          .message-text {
            padding: 10px 14px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
};

export default MessageList;