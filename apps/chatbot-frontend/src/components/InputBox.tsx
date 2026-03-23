import React, { useState, useEffect } from 'react';
import socketService from '../services/socket.service';

interface InputBoxProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  conversationId?: string | null;
  onFileUpload?: (file: File) => void;
  onUrlAdd?: (url: string) => void;
  uploadStatus?: string;
}

const InputBox: React.FC<InputBoxProps> = ({ onSend, disabled, conversationId, onFileUpload, onUrlAdd, uploadStatus }) => {
  const [value, setValue] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Handle typing indicators
  useEffect(() => {
    if (value.trim() && conversationId && socketService.isSocketConnected()) {
      socketService.startTyping(conversationId);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketService.stopTyping(conversationId!);
      }, 3000);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId && socketService.isSocketConnected()) {
        socketService.stopTyping(conversationId);
      }
    };
  }, [value, conversationId]);

  const handleSend = () => {
    if (value.trim()) {
      // Stop typing indicator
      if (conversationId && socketService.isSocketConnected()) {
        socketService.stopTyping(conversationId);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      onSend(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (urlValue.trim() && onUrlAdd) {
      onUrlAdd(urlValue.trim());
      setUrlValue('');
      setShowUrlInput(false);
    }
  };

  // Auto-detect URLs in text
  const hasUrl = /https?:\/\/[^\s]+/.test(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px' }}>
      {/* URL input (toggleable) */}
      {showUrlInput && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
          <input
            type="url"
            value={urlValue}
            onChange={e => setUrlValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            placeholder="Enter URL to analyze..."
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 16,
              border: '1px solid #2196f3',
              fontSize: 12,
              outline: 'none',
              background: '#f0f8ff'
            }}
          />
          <button
            onClick={handleUrlSubmit}
            disabled={!urlValue.trim()}
            style={{
              padding: '6px 12px',
              borderRadius: 16,
              background: urlValue.trim() ? '#2196f3' : '#e0e0e0',
              color: '#fff',
              border: 'none',
              cursor: urlValue.trim() ? 'pointer' : 'not-allowed',
              fontSize: 12
            }}
          >
            Add
          </button>
          <button
            onClick={() => setShowUrlInput(false)}
            style={{
              padding: '6px 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#666',
              fontSize: 14
            }}
          >
            x
          </button>
        </div>
      )}

      {/* Upload status */}
      {uploadStatus && (
        <div style={{ fontSize: 11, color: '#666', fontStyle: 'italic', paddingLeft: 4 }}>
          {uploadStatus}
        </div>
      )}

      {/* URL detected badge */}
      {hasUrl && (
        <div style={{ fontSize: 11, color: '#2196f3', paddingLeft: 4 }}>
          URL detected - will be analyzed
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Paperclip button (Feature 2) */}
        {onFileUpload && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            style={{
              padding: '8px',
              borderRadius: '50%',
              background: 'none',
              border: '1px solid #e0e0e0',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            title="Upload document (PDF, DOCX, TXT)"
          >
            📎
          </button>
        )}

        {/* Link button (Feature 3) */}
        {onUrlAdd && (
          <button
            onClick={() => setShowUrlInput(!showUrlInput)}
            disabled={disabled}
            style={{
              padding: '8px',
              borderRadius: '50%',
              background: showUrlInput ? '#e3f2fd' : 'none',
              border: '1px solid #e0e0e0',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.2s'
            }}
            title="Add URL to analyze"
          >
            🔗
          </button>
        )}

        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask about fire recovery, permits, debris removal..."
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 24,
            border: '1px solid #e0e0e0',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.2s ease',
            background: disabled ? '#f5f5f5' : '#fff'
          }}
          aria-label="Chat input"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          style={{
            padding: '12px 20px',
            borderRadius: 24,
            background: disabled || !value.trim() ? '#e0e0e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
            fontSize: 14,
            fontWeight: 500,
            transition: 'all 0.2s ease',
            minWidth: 60
          }}
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default InputBox;
