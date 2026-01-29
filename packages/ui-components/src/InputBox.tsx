import React, { useState, useRef, useEffect } from 'react';
import { InputBoxProps } from './types';

const InputBox: React.FC<InputBoxProps> = ({ 
  onSubmit, 
  placeholder = 'Type your message...', 
  disabled = false,
  className = '' 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) return;
    
    onSubmit(message.trim());
    setMessage('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    // Focus on mount
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  return (
    <form onSubmit={handleSubmit} className={`input-box ${className}`}>
      <div className="input-container">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="message-input"
          rows={1}
          maxLength={1000}
        />
        
        <button 
          type="submit" 
          disabled={!message.trim() || disabled}
          className="send-button"
          aria-label="Send message"
        >
          {disabled ? (
            <div className="loading-spinner" />
          ) : (
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
            </svg>
          )}
        </button>
      </div>
      
      <div className="input-hint">
        Press Enter to send, Shift + Enter for new line
      </div>

      <style>{`
        .input-box {
          width: 100%;
        }

        .input-container {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 24px;
          border: 1px solid #e9ecef;
          transition: border-color 0.2s ease;
        }

        .input-container:focus-within {
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
        }

        .message-input {
          flex: 1;
          resize: none;
          border: none;
          outline: none;
          background: transparent;
          font-size: 14px;
          line-height: 1.4;
          padding: 8px 12px;
          min-height: 20px;
          max-height: 120px;
          overflow-y: auto;
          font-family: inherit;
        }

        .message-input::placeholder {
          color: #6c757d;
        }

        .message-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .send-button {
          width: 40px;
          height: 40px;
          border: none;
          border-radius: 50%;
          background: #007bff;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .send-button:hover:not(:disabled) {
          background: #0056b3;
          transform: scale(1.05);
        }

        .send-button:disabled {
          background: #6c757d;
          cursor: not-allowed;
          transform: none;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .input-hint {
          font-size: 11px;
          color: #6c757d;
          text-align: center;
          margin-top: 4px;
          opacity: 0.7;
        }

        @media (max-width: 480px) {
          .input-hint {
            display: none;
          }
        }
      `}</style>
    </form>
  );
};

export default InputBox;