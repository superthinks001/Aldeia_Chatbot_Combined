import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatResponse } from '@aldeia/shared-types';
import { apiClient } from '@aldeia/utils';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { ChatWidgetProps } from './types';

const ChatWidget: React.FC<ChatWidgetProps> = ({ 
  onSendMessage, 
  sessionId = '',
  className = '',
  placeholder = 'Type your message...' 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let response: ChatResponse;
      
      if (onSendMessage) {
        // Use provided callback
        response = await onSendMessage(messageContent);
      } else {
        // Use default API client
        response = await apiClient.post<ChatResponse>('/api/chat', {
          message: messageContent,
          sessionId,
          context: {}
        });
      }

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.message,
        role: 'assistant',
        timestamp: new Date(),
        confidence: response.confidence
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        confidence: 0.1
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`chat-widget ${className}`}>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="chat-toggle-btn"
          aria-label="Open chat"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <h3>Aldeia Assistant</h3>
            <button
              onClick={toggleChat}
              className="chat-close-btn"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>
          
          <div className="chat-body">
            <MessageList messages={messages} />
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-footer">
            <InputBox
              onSubmit={handleSendMessage}
              placeholder={placeholder}
              disabled={isLoading}
            />
          </div>
        </div>
      )}

      <style>{`
        .chat-widget {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        }

        .chat-toggle-btn {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #007bff;
          color: white;
          border: none;
          font-size: 24px;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
          transition: all 0.2s ease;
        }

        .chat-toggle-btn:hover {
          background: #0056b3;
          transform: scale(1.05);
        }

        .chat-window {
          width: 380px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          background: #007bff;
          color: white;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .chat-close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        }

        .chat-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .chat-body {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .chat-footer {
          padding: 16px;
          border-top: 1px solid #e9ecef;
        }

        @media (max-width: 480px) {
          .chat-window {
            width: calc(100vw - 40px);
            height: calc(100vh - 40px);
            position: fixed;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;