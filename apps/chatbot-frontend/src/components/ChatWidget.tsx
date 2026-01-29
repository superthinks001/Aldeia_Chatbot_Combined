import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRebuild } from '../contexts/RebuildContext';
import { api } from '../utils/api';
import MessageList, { Message } from './MessageList';
import InputBox from './InputBox';
import ProactiveNotificationBanner from './ProactiveNotificationBanner';
import HandoffDialog from './HandoffDialog';
import VoiceInput from './voice/VoiceInput';
import VoiceOutput from './voice/VoiceOutput';
import TranslationSelector from './TranslationSelector';
import PromptTemplates from './PromptTemplates';
import ConfidenceScoreViewer from './ConfidenceScoreViewer';
import PushNotificationSettings from './PushNotificationSettings';
import socketService from '../services/socket.service';
import TranslationService from '../services/translation.service';
import { extractPageContext, monitorPageContext, PageContext } from '../utils/pageContextExtractor';

const ChatWidget: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { currentStep, propertyData, preferencesData, styleData, inspirationData, selectedDesignId } = useRebuild();
  const [showPromptTemplates, setShowPromptTemplates] = useState(() => {
    const saved = localStorage.getItem('aldeia_show_prompt_templates');
    return saved ? JSON.parse(saved) : true;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [pageContext, setPageContext] = useState<PageContext | null>(null);

  // Sprint 3: Proactive notifications and suggestions
  const [notifications, setNotifications] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  // Sprint 3: Human handoff dialog
  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [handoffData, setHandoffData] = useState<any>(null);

  // Voice and Socket features
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Translation features
  const [userLanguage, setUserLanguage] = useState<string>(() => {
    // Get from localStorage or user profile or default to 'en'
    const storedLanguage = localStorage.getItem('aldeia_user_language');
    if (storedLanguage) return storedLanguage;
    // Check if user has language property (optional, may not exist in User type)
    const userLang = (user as any)?.language;
    return userLang || 'en';
  });
  const [isTranslating, setIsTranslating] = useState(false);

  // Section visibility states
  const [sectionsVisible, setSectionsVisible] = useState(() => {
    const saved = localStorage.getItem('aldeia_chatbot_sections');
    return saved ? JSON.parse(saved) : {
      translation: true,
      contextBadges: true,
      notifications: true,
      suggestions: true,
      voiceControls: true
    };
  });

  // Section heights (resizable) - for manual resize override
  const [sectionHeights, setSectionHeights] = useState(() => {
    const saved = localStorage.getItem('aldeia_chatbot_section_heights');
    return saved ? JSON.parse(saved) : {
      messageArea: null, // null means use flex: 1 (auto-expand)
    };
  });
  
  // Apply manual height if set, otherwise use flex
  const messageAreaStyle = sectionHeights.messageArea !== null
    ? { height: `${sectionHeights.messageArea}px`, flex: 'none' as const }
    : { flex: 1 };

  // Save section visibility to localStorage
  useEffect(() => {
    localStorage.setItem('aldeia_chatbot_sections', JSON.stringify(sectionsVisible));
  }, [sectionsVisible]);

  // Save section heights to localStorage
  useEffect(() => {
    localStorage.setItem('aldeia_chatbot_section_heights', JSON.stringify(sectionHeights));
  }, [sectionHeights]);

  // Save prompt templates visibility
  useEffect(() => {
    localStorage.setItem('aldeia_show_prompt_templates', JSON.stringify(showPromptTemplates));
  }, [showPromptTemplates]);

  // Extract page context on mount and monitor changes
  useEffect(() => {
    // Extract initial context
    const context = extractPageContext();
    setPageContext(context);

    // Monitor context changes (URL changes, scrolling)
    const cleanup = monitorPageContext((newContext) => {
      setPageContext(newContext);
    }, 10000); // Check every 10 seconds

    return cleanup;
  }, []);

  // Initialize WebSocket connection for authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      const token = localStorage.getItem('aldeia_access_token');
      if (token) {
        socketService.connect(token);
        
        // Set up event listeners
        socketService.onNewMessage((data) => {
          // Handle real-time messages if needed
          console.log('New message received:', data);
        });

        socketService.onUserTyping((data) => {
          setOtherUserTyping(data.isTyping);
        });

        return () => {
          socketService.disconnect();
        };
      }
    }
  }, [isAuthenticated, user]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generate conversation ID for tracking
  useEffect(() => {
    if (!conversationId) {
      setConversationId(`conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    }
  }, [conversationId]);

  // Get rebuild step context for chatbot
  const getRebuildStepContext = () => {
    const stepContexts: { [key: string]: { name: string; description: string; data?: any } } = {
      'landing': {
        name: 'Landing Page',
        description: 'You\'re on the landing page. I can help you get started with the rebuild process.'
      },
      'location': {
        name: 'Location Confirmation',
        description: 'You\'re confirming your rebuild property location and address.',
        data: propertyData
      },
      'preferences-style': {
        name: 'Style Selection',
        description: 'You\'re choosing whether to rebuild in the same style or something new.',
        data: styleData
      },
      'preferences-needs': {
        name: 'Needs Selection',
        description: 'You\'re specifying your rebuild needs like bedrooms, bathrooms, stories, and optional features.',
        data: preferencesData
      },
      'inspiration': {
        name: 'Inspiration',
        description: 'You\'re uploading design ideas or selecting inspiration images for your rebuild.',
        data: inspirationData
      },
      'budget': {
        name: 'Budget & Insurance',
        description: 'You\'re setting your rebuild budget and insurance coverage.'
      },
      'matches': {
        name: 'Design Matches',
        description: 'You\'re viewing your personalized pre-approved rebuild design matches.'
      },
      'details': {
        name: 'Design Details',
        description: 'You\'re viewing detailed information about a selected rebuild design.'
      }
    };
    return stepContexts[currentStep] || { name: 'Rebuild Process', description: 'You\'re in the rebuild process.' };
  };

  // Greeting on mount (works for both authenticated and rebuild flow)
  useEffect(() => {
    if (messages.length === 0) {
      const generateGreeting = async () => {
        const stepContext = getRebuildStepContext();
        let greeting = `Hello ${user?.name || 'there'}! I'm the Aldeia Fire Recovery Assistant.`;

        // Add step-aware greeting
        if (stepContext) {
          greeting += ` I can see you're on the ${stepContext.name.toLowerCase()}. ${stepContext.description}`;
        }

        // Add location-aware greeting
        if (pageContext?.location.detected) {
          greeting += ` I can also see you're looking at information about ${pageContext.location.city || pageContext.location.county}.`;
        }

        // Add topic-aware greeting
        if (pageContext?.primaryTopic) {
          const topicName = pageContext.primaryTopic.replace(/-/g, ' ');
          greeting += ` I can help you with ${topicName}.`;
        }

        greeting += ` How can I assist you today?`;

        // Translate greeting if user language is not English
        let finalGreeting = greeting;
        if (userLanguage !== 'en') {
          try {
            finalGreeting = await TranslationService.translateBotResponse(greeting, userLanguage);
          } catch (error) {
            console.warn('Greeting translation failed:', error);
          }
        }

        setMessages([{
          sender: 'bot',
          text: finalGreeting,
          timestamp: new Date()
        }]);
      };

      generateGreeting();
    }
  }, [currentStep, user, pageContext, userLanguage]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Stop typing indicator
    if (conversationId && isAuthenticated) {
      socketService.stopTyping(conversationId);
    }

    // Translate user input to English if needed (for processing)
    let processedMessage = message;
    if (userLanguage !== 'en') {
      try {
        const translationResult = await TranslationService.translateUserInput(message);
        processedMessage = translationResult.translatedText;
      } catch (error) {
        console.warn('User input translation failed, using original:', error);
        processedMessage = message;
      }
    }

    // Add user message (show original, but send translated to backend)
    const userMessage: Message = {
      sender: 'user',
      text: message, // Show original message to user
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const stepContext = getRebuildStepContext();
      
      // Send to authenticated API with comprehensive page context including rebuild step
      // Use processed (translated) message for backend
      const response = await api.sendMessage(processedMessage, {
        pageUrl: window.location.href,
        pageTitle: document.title,
        location: pageContext?.location.detected
          ? `${pageContext.location.city || ''} ${pageContext.location.county || ''}`.trim()
          : undefined,
        topic: pageContext?.primaryTopic || stepContext.name.toLowerCase(),
        rebuildStep: currentStep,
        rebuildStepContext: stepContext.description,
        conversationId: conversationId || undefined,
        isFirstMessage: messages.length === 0,
        context: pageContext ? {
          headings: pageContext.headings.h1.concat(pageContext.headings.h2).join(', '),
          keywords: pageContext.keywords.slice(0, 10).join(', '),
          rebuildStep: currentStep,
          rebuildStepName: stepContext.name,
        } : {
          rebuildStep: currentStep,
          rebuildStepName: stepContext.name,
        }
      });

      // Get bot response
      let botResponseText = response.data.response || 'I apologize, I encountered an error.';

      // Translate bot response if user language is not English
      if (userLanguage !== 'en') {
        try {
          setIsTranslating(true);
          const translated = await TranslationService.translateBotResponse(botResponseText, userLanguage);
          botResponseText = translated;
        } catch (error) {
          console.warn('Translation failed, using original:', error);
        } finally {
          setIsTranslating(false);
        }
      }

      // Sprint 2/3: Extract all enhanced data from response
      const botMessage: Message = {
        sender: 'bot',
        text: botResponseText,
        confidence: response.data.confidence,
        bias: response.data.bias,
        uncertainty: response.data.uncertainty,
        hallucination: response.data.hallucination,
        grounded: response.data.grounded,
        sources: response.data.factCheck?.sources,
        timestamp: new Date(),

        // Sprint 2: Enhanced fields
        biasAnalysis: response.data.biasAnalysis,
        hallucinationRisk: response.data.hallucinationRisk,
        factCheck: response.data.factCheck,
        intentConfidence: response.data.intentConfidence,
        secondaryIntents: response.data.secondaryIntents,
        entities: response.data.entities,
        intent: response.data.intent,

        // Sprint 3: Handoff fields
        handoffRequired: response.data.handoffRequired,
        handoffReason: response.data.handoffReason,
        handoffPriority: response.data.handoffPriority,
        handoffMessage: response.data.handoffMessage,
        handoffContact: response.data.handoffContact,
        handoffExpert: response.data.handoffExpert
      };

      setMessages(prev => [...prev, botMessage]);

      // Sprint 3: Update notifications
      if (response.data.notifications && response.data.notifications.length > 0) {
        setNotifications(response.data.notifications);
      } else if (response.data.notification) {
        setNotifications([response.data.notification]);
      }

      // Sprint 3: Update suggestions
      if (response.data.suggestions && response.data.suggestions.length > 0) {
        setSuggestions(response.data.suggestions);
      }

      // Sprint 3: Show handoff dialog if triggered
      if (response.data.handoffRequired) {
        setHandoffData({
          reason: response.data.handoffReason,
          priority: response.data.handoffPriority,
          message: response.data.handoffMessage,
          contact: response.data.handoffContact,
          expert: response.data.handoffExpert
        });
        setHandoffDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        sender: 'bot',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Allow chat for rebuild flow even without authentication
  const isRebuildFlow = ['landing', 'location', 'preferences-style', 'preferences-needs', 'inspiration', 'budget', 'matches', 'details'].includes(currentStep);
  
  if (!isAuthenticated && !isRebuildFlow) {
    return (
      <div className="chat-widget-unauthorized">
        <div className="unauthorized-message">
          <h3>Authentication Required</h3>
          <p>Please log in to use the chat assistant.</p>
          <button onClick={() => window.location.href = '/login'}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`} style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      <div className="chat-header" style={{ flexShrink: 0 }}>
        <div className="chat-header-info">
          <h3>Aldeia Assistant</h3>
          {isAuthenticated && <span className="user-info">{user?.email}</span>}
          {!isAuthenticated && isRebuildFlow && (
            <span className="user-info">Rebuild Assistant</span>
          )}
        </div>
        <div className="chat-header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? '▲' : '▼'}
          </button>
          {isAuthenticated && (
            <button onClick={logout} title="Logout">
              🚪
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0
        }}>
          {/* Context badges - Collapsible */}
          {sectionsVisible.contextBadges && (
            <div style={{
              padding: '6px 10px',
              backgroundColor: '#e3f2fd',
              borderBottom: '1px solid #90caf9',
              fontSize: 11,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              position: 'relative',
              flexShrink: 0
            }}>
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, contextBadges: false }))}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '12px',
                  color: '#666',
                  zIndex: 1
                }}
                title="Hide context badges"
              >
                ×
              </button>
            {/* Rebuild Step Badge */}
            {isRebuildFlow && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#ff6b4a',
                color: 'white',
                borderRadius: 12,
                fontWeight: 600
              }}>
                🔄 {getRebuildStepContext().name}
              </span>
            )}
            {pageContext?.location.detected && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#1976d2',
                color: 'white',
                borderRadius: 12,
                fontWeight: 600
              }}>
                📍 {pageContext.location.city || pageContext.location.county}
              </span>
            )}
            {pageContext?.primaryTopic && (
              <span style={{
                padding: '2px 8px',
                backgroundColor: '#388e3c',
                color: 'white',
                borderRadius: 12,
                fontWeight: 600
              }}>
                🏷️ {pageContext.primaryTopic.replace(/-/g, ' ')}
              </span>
            )}
            </div>
          )}
          {!sectionsVisible.contextBadges && (
            <div style={{
              padding: '4px 12px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '11px',
              color: '#666'
            }}>
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, contextBadges: true }))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#667eea',
                  textDecoration: 'underline'
                }}
              >
                Show Context Badges
              </button>
            </div>
          )}

          {/* Sprint 3: Proactive Notification Banner - Collapsible */}
          {sectionsVisible.notifications && notifications.length > 0 && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, notifications: false }))}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(255, 255, 255, 0.8)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  fontSize: '12px',
                  color: '#666',
                  zIndex: 1,
                  borderRadius: '4px'
                }}
                title="Hide notifications"
              >
                ×
              </button>
              <ProactiveNotificationBanner
                notifications={notifications}
                onDismiss={(id) => {
                  setNotifications(prev => prev.filter(n => n.id !== id));
                }}
              />
            </div>
          )}
          {!sectionsVisible.notifications && notifications.length > 0 && (
            <div style={{
              padding: '4px 10px',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '11px',
              color: '#666',
              flexShrink: 0
            }}>
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, notifications: true }))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#667eea',
                  textDecoration: 'underline'
                }}
              >
                Show Notifications ({notifications.length})
              </button>
            </div>
          )}

          {/* Prompt Templates */}
          {showPromptTemplates && (
            <PromptTemplates
              onSelectTemplate={(prompt) => {
                handleSendMessage(prompt);
              }}
              currentStep={currentStep}
              onHide={() => setShowPromptTemplates(false)}
            />
          )}
          {!showPromptTemplates && (
            <div style={{
              padding: '6px 12px',
              borderBottom: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              fontSize: 11,
              flexShrink: 0
            }}>
              <button
                onClick={() => setShowPromptTemplates(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#667eea',
                  textDecoration: 'underline',
                  fontSize: 11,
                  padding: 0
                }}
              >
                Show Prompt Templates
              </button>
            </div>
          )}

          {isTranslating && (
            <div style={{
              padding: '4px 10px',
              fontSize: 11,
              color: '#666',
              fontStyle: 'italic',
              textAlign: 'center',
              flexShrink: 0
            }}>
              Translating...
            </div>
          )}
          
          {/* Resizable Message Area (Answer Window) - Dynamically expands */}
          <div 
            style={{
              position: 'relative',
              ...messageAreaStyle,
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid #e0e0e0',
              borderBottom: '1px solid #e0e0e0',
              minHeight: 0,
              overflow: 'hidden'
            }}
          >
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              minHeight: 0
            }}>
              <MessageList messages={messages} conversationId={conversationId || undefined} />
            </div>
            
            {/* Resize Handle for Message Area */}
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const container = e.currentTarget.parentElement;
                if (!container) return;
                
                const startY = e.clientY;
                const startHeight = container.offsetHeight;
                const parent = container.parentElement;
                if (!parent) return;

                const handleMouseMove = (e: MouseEvent) => {
                  const deltaY = e.clientY - startY;
                  
                  // Calculate available space
                  const parentHeight = parent.offsetHeight;
                  const siblings = Array.from(parent.children).filter((child: any) => child !== container);
                  const siblingsHeight = siblings.reduce((sum: number, child: any) => {
                    return sum + (child.offsetHeight || 0);
                  }, 0);
                  
                  const maxHeight = parentHeight - siblingsHeight - 20; // 20px buffer
                  const newHeight = Math.max(150, Math.min(maxHeight, startHeight + deltaY));
                  
                  setSectionHeights((prev: typeof sectionHeights) => ({
                    ...prev,
                    messageArea: newHeight
                  }));
                  container.style.flex = 'none';
                  container.style.height = `${newHeight}px`;
                };

                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Reset to auto-expand (flex: 1)
                setSectionHeights((prev: typeof sectionHeights) => ({
                  ...prev,
                  messageArea: null
                }));
                const container = e.currentTarget.parentElement;
                if (container) {
                  container.style.flex = '1';
                  container.style.height = '';
                }
              }}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '10px',
                cursor: 'ns-resize',
                backgroundColor: 'transparent',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Drag to resize message area (double-click to reset)"
            >
              <div style={{
                width: '80px',
                height: '5px',
                backgroundColor: '#999',
                borderRadius: '3px',
                transition: 'all 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#667eea';
                e.currentTarget.style.width = '100px';
                e.currentTarget.style.height = '6px';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#999';
                e.currentTarget.style.width = '80px';
                e.currentTarget.style.height = '5px';
              }}
              />
            </div>
          </div>

          {/* Sprint 3: Interest-based Suggestions */}
          {sectionsVisible.suggestions && suggestions.length > 0 && (
            <div style={{
              padding: '6px 10px',
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #e0e0e0',
              fontSize: 11,
              flexShrink: 0
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: '#2c3e50' }}>
                💡 Suggested for you
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggestions.slice(0, 3).map((suggestion, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: 12,
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => {
                      if (suggestion.url) {
                        window.open(suggestion.url, '_blank');
                      }
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e3f2fd';
                      e.currentTarget.style.borderColor = '#1976d2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#e0e0e0';
                    }}
                  >
                    {suggestion.icon || '📄'} {suggestion.title}
                  </div>
                ))}
              </div>
            </div>
          )}
          {!sectionsVisible.suggestions && suggestions.length > 0 && (
            <div style={{
              padding: '4px 10px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '11px',
              color: '#666',
              flexShrink: 0
            }}>
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, suggestions: true }))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#667eea',
                  textDecoration: 'underline'
                }}
              >
                Show Suggestions ({suggestions.length})
              </button>
            </div>
          )}

          <div style={{ flexShrink: 0 }}>
            <InputBox onSend={handleSendMessage} disabled={loading} conversationId={conversationId} />
          </div>

          {/* Voice Controls and Play Sound Section - Side by Side */}
          <div style={{
            padding: '6px 10px',
            borderTop: '1px solid #e0e0e0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            flexShrink: 0
          }}>
            {/* Voice Controls Section */}
            {sectionsVisible.voiceControls ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <button
                  onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                  style={{
                    padding: '6px 12px',
                    background: isVoiceEnabled ? '#667eea' : '#f5f5f5',
                    color: isVoiceEnabled ? 'white' : '#333',
                    border: '1px solid #e0e0e0',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0
                  }}
                  title={isVoiceEnabled ? 'Disable voice input' : 'Enable voice input'}
                >
                  🎤 {isVoiceEnabled ? 'Voice On' : 'Voice Off'}
                </button>
                {isVoiceEnabled && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <VoiceInput
                      onTranscript={(transcript) => {
                        handleSendMessage(transcript);
                      }}
                      isDisabled={loading}
                    />
                  </div>
                )}
                {otherUserTyping && !isVoiceEnabled && (
                  <span style={{ fontSize: 11, color: '#666', fontStyle: 'italic', flexShrink: 0 }}>
                    Someone is typing...
                  </span>
                )}
                <button
                  onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, voiceControls: false }))}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '12px',
                    color: '#666',
                    flexShrink: 0
                  }}
                  title="Hide voice controls"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSectionsVisible((prev: typeof sectionsVisible) => ({ ...prev, voiceControls: true }))}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#667eea',
                  textDecoration: 'underline',
                  fontSize: '11px',
                  padding: '4px 8px',
                  flexShrink: 0
                }}
              >
                Show Voice Controls
              </button>
            )}

            {/* Play Sound Section (Voice Output) */}
            {messages.length > 0 && messages[messages.length - 1].sender === 'bot' && (
              <div style={{ flexShrink: 0 }}>
                <VoiceOutput
                  text={messages[messages.length - 1].text || ''}
                  autoPlay={false}
                  showControls={true}
                />
              </div>
            )}
          </div>

          {/* Messages end ref for auto-scroll */}
          <div ref={messagesEndRef} />

          {/* Confidence Score Viewer */}
          <ConfidenceScoreViewer
            conversationId={conversationId || undefined}
            userId={user?.id ? (typeof user.id === 'number' ? user.id : parseInt(user.id, 10)) : undefined}
          />

          {/* Push Notification Settings */}
          <PushNotificationSettings />
        </div>
      )}

      {/* Sprint 3: Human Handoff Dialog */}
      {handoffData && (
        <HandoffDialog
          isOpen={handoffDialogOpen}
          reason={handoffData.reason}
          priority={handoffData.priority}
          message={handoffData.message}
          contact={handoffData.contact}
          expert={handoffData.expert}
          onClose={() => setHandoffDialogOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatWidget;
