/**
 * Session Store Service
 *
 * Centralized session management replacing ad-hoc conversationContexts Map.
 * Provides TTL-based auto-cleanup and structured session data.
 */

export interface SessionData {
  history: Array<{ sender: string; text: string }>;
  userProfile?: Record<string, any>;
  pageContext?: any;
  rebuildStep?: string;
  rebuildStepContext?: string;
  lastUserMessage?: string;
  viewedSuggestions?: string[];
  /** Chunks from user-uploaded documents (Feature 2) */
  uploadedDocChunks?: EmbeddedChunk[];
  /** Chunks from scraped URLs - session-scoped, NOT persisted (Feature 3) */
  scrapedUrlChunks?: EmbeddedChunk[];
  lastAccessed: number;
}

export interface EmbeddedChunk {
  text: string;
  embedding: number[];
  source: string;
  sourceType: 'user_upload' | 'scraped_url';
  chunkIndex: number;
  metadata?: Record<string, any>;
}

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // cleanup every 5 minutes
const MAX_HISTORY = 5;

const sessions = new Map<string, SessionData>();

/** Auto-cleanup expired sessions */
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Get or create a session by ID
 */
export function getSession(id: string): SessionData {
  let session = sessions.get(id);
  if (!session) {
    session = {
      history: [],
      lastAccessed: Date.now()
    };
    sessions.set(id, session);
  }
  session.lastAccessed = Date.now();
  return session;
}

/**
 * Update session with partial data (merges with existing)
 */
export function updateSession(id: string, data: Partial<SessionData>): SessionData {
  const session = getSession(id);
  Object.assign(session, data);
  session.lastAccessed = Date.now();

  // Enforce history limit
  if (session.history && session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }

  sessions.set(id, session);
  return session;
}

/**
 * Clear a session entirely
 */
export function clearSession(id: string): void {
  sessions.delete(id);
}

/**
 * Add a message to session history
 */
export function addToHistory(id: string, sender: string, text: string): void {
  const session = getSession(id);
  session.history.push({ sender, text });
  if (session.history.length > MAX_HISTORY) {
    session.history = session.history.slice(-MAX_HISTORY);
  }
  session.lastAccessed = Date.now();
}
