import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Maximize2, Minimize2, GripVertical } from 'lucide-react';
import ChatWidget from './ChatWidget';
import { useRebuild } from '../contexts/RebuildContext';
import './FloatingChatbotIcon.css';

const FloatingChatbotIcon: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chatbotSize, setChatbotSize] = useState(() => {
    const saved = localStorage.getItem('aldeia_chatbot_size');
    return saved ? JSON.parse(saved) : { width: 400, height: 600 };
  });
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('aldeia_chatbot_position');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const chatbotRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const { currentStep } = useRebuild();

  const getStepContext = (): string => {
    const stepContexts: { [key: string]: string } = {
      'landing': 'landing page',
      'location': 'location confirmation page where you\'re confirming your rebuild property address',
      'preferences-style': 'style selection page where you\'re choosing to rebuild in the same style or something new',
      'preferences-needs': 'needs selection page where you\'re specifying bedrooms, bathrooms, stories, and optional features',
      'inspiration': 'inspiration page where you\'re uploading design ideas or selecting inspiration images',
      'budget': 'budget and insurance page where you\'re setting your rebuild budget and insurance coverage',
      'matches': 'design matches page showing your personalized pre-approved rebuild matches',
      'details': 'design details page showing detailed information about a selected design',
      'chat': 'chat interface'
    };
    return stepContexts[currentStep] || 'the rebuild process';
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      // Save current size before going fullscreen
      localStorage.setItem('aldeia_chatbot_size', JSON.stringify(chatbotSize));
    }
  };

  // Save size to localStorage
  useEffect(() => {
    if (!isFullscreen) {
      localStorage.setItem('aldeia_chatbot_size', JSON.stringify(chatbotSize));
    }
  }, [chatbotSize, isFullscreen]);

  // Save position to localStorage
  useEffect(() => {
    if (!isFullscreen && (position.x !== 0 || position.y !== 0)) {
      localStorage.setItem('aldeia_chatbot_position', JSON.stringify(position));
    }
  }, [position, isFullscreen]);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = chatbotSize.width;
    const startHeight = chatbotSize.height;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(300, Math.min(window.innerWidth - 48, startWidth + (e.clientX - startX)));
      const newHeight = Math.max(400, Math.min(window.innerHeight - 120, startHeight + (e.clientY - startY)));
      setChatbotSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [chatbotSize]);

  // Handle drag
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    if (isFullscreen) return;
    e.preventDefault();
    setIsDragging(true);
    const startPos = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - startPos.x;
      const newY = e.clientY - startPos.y;
      const maxX = window.innerWidth - chatbotSize.width;
      const maxY = window.innerHeight - chatbotSize.height;
      setPosition({
        x: Math.max(0, Math.min(maxX, newX)),
        y: Math.max(0, Math.min(maxY, newY))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isFullscreen, position, chatbotSize]);

  return (
    <>
      {/* Floating Chatbot Icon */}
      <div 
        className={`floating-chatbot-icon ${isOpen ? 'open' : ''}`}
        onClick={handleToggle}
        title="Chat with Aldeia Assistant"
      >
        {isOpen ? (
          <X className="chatbot-icon-x" />
        ) : (
          <MessageCircle className="chatbot-icon-message" />
        )}
      </div>

      {/* Chat Widget Overlay */}
      {isOpen && (
        <div 
          ref={chatbotRef}
          className={`chatbot-overlay ${isFullscreen ? 'fullscreen' : ''} ${isDragging ? 'dragging' : ''}`}
          style={isFullscreen ? {} : {
            width: `${chatbotSize.width}px`,
            height: `${chatbotSize.height}px`,
            right: position.x === 0 ? '24px' : 'auto',
            left: position.x !== 0 ? `${position.x}px` : 'auto',
            bottom: position.y === 0 ? '90px' : 'auto',
            top: position.y !== 0 ? `${position.y}px` : 'auto',
          }}
        >
          <div className="chatbot-container">
            <div 
              className="chatbot-header"
              onMouseDown={handleHeaderMouseDown}
              style={{ cursor: isFullscreen ? 'default' : 'move' }}
            >
              <div className="chatbot-header-left">
                {!isFullscreen && (
                  <GripVertical className="chatbot-drag-handle" size={16} />
                )}
                <div className="chatbot-header-content">
                  <h3 className="chatbot-title">Aldeia Assistant</h3>
                  <p className="chatbot-context">
                    I can help you with {getStepContext()}
                  </p>
                </div>
              </div>
              <div className="chatbot-header-actions">
                <button 
                  className="chatbot-action-button"
                  onClick={handleFullscreen}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="chatbot-action-icon" />
                  ) : (
                    <Maximize2 className="chatbot-action-icon" />
                  )}
                </button>
                <button 
                  className="chatbot-close-button"
                  onClick={handleToggle}
                  aria-label="Close chatbot"
                >
                  <X className="chatbot-close-icon" />
                </button>
              </div>
            </div>
            <div className="chatbot-widget-container">
              <ChatWidget />
            </div>
            {!isFullscreen && (
              <div 
                ref={resizeRef}
                className="chatbot-resize-handle"
                onMouseDown={handleMouseDown}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChatbotIcon;
