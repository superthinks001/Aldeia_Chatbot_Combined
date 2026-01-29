import React, { useState, useEffect } from 'react';
import socketService from '../services/socket.service';

interface InputBoxProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  conversationId?: string | null;
}

const InputBox: React.FC<InputBoxProps> = ({ onSend, disabled, conversationId }) => {
  const [value, setValue] = useState('');
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

  return (
    <div style={{ display: 'flex', gap: 8 }}>
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
  );
};

export default InputBox;
