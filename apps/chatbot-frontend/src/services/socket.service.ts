import { io, Socket } from 'socket.io-client';

// Safe access to environment variables (webpack DefinePlugin or fallback)
// Use same origin in production (empty string tells Socket.io to use current origin)
const SOCKET_URL = (typeof process !== 'undefined' && process.env?.REACT_APP_SOCKET_URL)
  ? process.env.REACT_APP_SOCKET_URL
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? ''
      : 'http://localhost:3001');

export interface Message {
  id: number;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  userId?: number;
}

export interface TypingEvent {
  userId: number;
  userEmail: string;
  conversationId: string;
  isTyping: boolean;
}

export interface UserStatusEvent {
  userId: number;
  status: 'online' | 'offline';
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Initialize and connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('Disconnected from WebSocket server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error: Error) => {
      console.error('Socket error:', error);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  /**
   * Send typing start indicator
   */
  startTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  /**
   * Send typing stop indicator
   */
  stopTyping(conversationId: string): void {
    if (this.socket) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  /**
   * Send message read acknowledgment
   */
  markMessageAsRead(messageId: number, conversationId: string): void {
    if (this.socket) {
      this.socket.emit('message_read', { messageId, conversationId });
    }
  }

  /**
   * Listen for new messages
   */
  onNewMessage(
    callback: (data: { conversationId: string; message: Message }) => void
  ): void {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  /**
   * Listen for typing indicators
   */
  onUserTyping(callback: (data: TypingEvent) => void): void {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  /**
   * Listen for user status changes
   */
  onUserStatus(callback: (data: UserStatusEvent) => void): void {
    if (this.socket) {
      this.socket.on('user_status', callback);
    }
  }

  /**
   * Listen for conversation updates
   */
  onConversationUpdate(
    callback: (data: {
      conversationId: string;
      update: {
        title?: string;
        status?: string;
        language?: string;
      };
    }) => void
  ): void {
    if (this.socket) {
      this.socket.on('conversation_updated', callback);
    }
  }

  /**
   * Listen for admin broadcasts
   */
  onAdminBroadcast(
    callback: (data: { message: string; timestamp: Date }) => void
  ): void {
    if (this.socket) {
      this.socket.on('admin_broadcast', callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (this.socket) {
      if (event) {
        this.socket.removeAllListeners(event);
      } else {
        this.socket.removeAllListeners();
      }
    }
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
