/**
 * LLM Response Service
 *
 * Generates conversational, empathic responses via Claude API
 * using retrieved document chunks as grounding context.
 */

import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const MAX_CHUNK_CHARS = 2000;
const MAX_HISTORY_TURNS = 5;

/** Rate limiter: max 10 LLM calls per minute per session */
const sessionCallCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  let entry = sessionCallCounts.get(sessionId);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000 };
    sessionCallCounts.set(sessionId, entry);
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count++;
  return true;
}

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!CLAUDE_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: CLAUDE_API_KEY });
  }
  return anthropicClient;
}

/** Placeholder patterns that indicate a non-real API key */
const PLACEHOLDER_PATTERNS = [
  /^optional/i,
  /^your_/i,
  /^placeholder/i,
  /^sk-ant-.*example/i,
  /^change.?me/i,
  /^insert/i,
  /^todo/i,
  /^xxx/i,
  /^test_/i
];

/** Check if the LLM is available (real API key configured, not a placeholder) */
export function isLLMAvailable(): boolean {
  if (!CLAUDE_API_KEY) return false;
  if (CLAUDE_API_KEY.length < 10) return false;
  if (PLACEHOLDER_PATTERNS.some(p => p.test(CLAUDE_API_KEY))) return false;
  return true;
}

export interface LLMInput {
  userMessage: string;
  retrievedChunks: Array<{
    text: string;
    source: string;
    distance?: number;
    sourceType?: string;
  }>;
  conversationHistory?: Array<{ sender: string; text: string }>;
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
  userProfile?: Record<string, any>;
  sessionId?: string;
}

export interface LLMResponse {
  conversationalResponse: string;
  sourcesReferenced: string[];
}

const SYSTEM_PROMPT = `You are Aldeia Advisor, a warm, empathic fire recovery assistant for residents in LA County and Pasadena affected by wildfires.

GUIDELINES:
- Be warm, compassionate, and supportive — these are people recovering from devastating fires
- Ground ALL answers in the provided document excerpts. Reference sources by name when citing information.
- If the excerpts don't fully answer the question, say so honestly and suggest next steps
- Never fabricate information beyond what the excerpts contain
- Use clear formatting: bullet points, bold for key terms, numbered steps for processes
- When confidence is low, add appropriate caveats ("Based on the available information..." or "You may want to verify this with...")
- Respect the detected intent to adjust tone (e.g., more urgent for emergency, more detailed for process questions)
- Keep responses focused and concise — don't repeat the entire document, extract what's relevant
- If sources are from user uploads or scraped URLs, note that clearly
- Always end with an offer to help further or a relevant follow-up question`;

/**
 * Generate a conversational response using Claude API
 */
export async function generateConversationalResponse(input: LLMInput): Promise<LLMResponse> {
  const client = getClient();
  if (!client) {
    throw new Error('LLM not available');
  }

  // Rate limit check
  if (input.sessionId && !checkRateLimit(input.sessionId)) {
    throw new Error('Rate limit exceeded — please wait a moment before asking another question');
  }

  // Build context from retrieved chunks
  const chunksContext = input.retrievedChunks
    .slice(0, 5) // max 5 chunks
    .map((chunk, i) => {
      const truncatedText = chunk.text.length > MAX_CHUNK_CHARS
        ? chunk.text.slice(0, MAX_CHUNK_CHARS) + '...'
        : chunk.text;
      const sourceLabel = chunk.sourceType === 'user_upload'
        ? `[User Upload] ${chunk.source}`
        : chunk.sourceType === 'scraped_url'
          ? `[Web] ${chunk.source}`
          : chunk.source;
      return `--- Excerpt ${i + 1} (Source: ${sourceLabel}, Relevance: ${chunk.distance !== undefined ? (1 - chunk.distance / 2).toFixed(2) : 'N/A'}) ---\n${truncatedText}`;
    })
    .join('\n\n');

  // Build conversation history for context
  const historyMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  if (input.conversationHistory && input.conversationHistory.length > 0) {
    const recentHistory = input.conversationHistory.slice(-MAX_HISTORY_TURNS);
    for (const turn of recentHistory) {
      // Skip the current message (it will be the user message)
      if (turn.text === input.userMessage && turn.sender === 'user') continue;
      historyMessages.push({
        role: turn.sender === 'user' ? 'user' : 'assistant',
        content: turn.text
      });
    }
  }

  // Build the user message with context
  let contextInfo = '';
  if (input.intent) contextInfo += `\nDetected intent: ${input.intent}`;
  if (input.entities && Object.keys(input.entities).length > 0) {
    contextInfo += `\nDetected entities: ${JSON.stringify(input.entities)}`;
  }
  if (input.confidence !== undefined) {
    contextInfo += `\nDocument match confidence: ${(input.confidence * 100).toFixed(0)}%`;
  }

  const userContent = `${contextInfo ? `[Context]${contextInfo}\n\n` : ''}[Retrieved Documents]\n${chunksContext || 'No relevant documents found.'}\n\n[User Question]\n${input.userMessage}`;

  // Build messages array
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...historyMessages,
    { role: 'user', content: userContent }
  ];

  // Ensure messages alternate properly (Claude requires user/assistant alternation)
  const cleanedMessages = ensureAlternatingRoles(messages);

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: cleanedMessages
  });

  // Extract text from response
  const responseText = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('\n');

  // Extract referenced sources
  const sourcesReferenced = Array.from(new Set(
    input.retrievedChunks
      .filter(chunk => responseText.includes(chunk.source) || true) // include all provided sources
      .map(chunk => chunk.source)
  ));

  return {
    conversationalResponse: responseText,
    sourcesReferenced
  };
}

/**
 * Ask the LLM to rate document adequacy for a question (Feature 4)
 */
export async function assessDocumentAdequacy(
  question: string,
  chunks: Array<{ text: string; source: string }>
): Promise<number> {
  const client = getClient();
  if (!client) return 3; // neutral default if LLM unavailable

  const chunksText = chunks
    .slice(0, 7)
    .map((c, i) => `Excerpt ${i + 1} (${c.source}): ${c.text.slice(0, 1000)}`)
    .join('\n\n');

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 50,
      system: 'You are a document relevance assessor. Rate how well the provided excerpts can answer the user question. Respond with ONLY a single number 1-5 where: 1=completely irrelevant, 2=barely relevant, 3=partially answers, 4=mostly answers, 5=fully answers.',
      messages: [{
        role: 'user',
        content: `Question: ${question}\n\nExcerpts:\n${chunksText}\n\nRating (1-5):`
      }]
    });

    const text = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('');

    const score = parseInt(text.trim(), 10);
    return (score >= 1 && score <= 5) ? score : 3;
  } catch {
    return 3; // default on error
  }
}

/** Ensure messages alternate between user and assistant roles */
function ensureAlternatingRoles(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Array<{ role: 'user' | 'assistant'; content: string }> {
  if (messages.length === 0) return messages;

  const cleaned: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (cleaned.length === 0) {
      // First message must be user
      if (msg.role === 'user') {
        cleaned.push(msg);
      }
      continue;
    }

    const lastRole = cleaned[cleaned.length - 1].role;
    if (msg.role !== lastRole) {
      cleaned.push(msg);
    } else {
      // Merge consecutive same-role messages
      cleaned[cleaned.length - 1].content += '\n\n' + msg.content;
    }
  }

  // Ensure last message is from user
  if (cleaned.length > 0 && cleaned[cleaned.length - 1].role !== 'user') {
    cleaned.pop();
  }

  // If empty, shouldn't happen but safety check
  if (cleaned.length === 0) {
    return messages.slice(-1);
  }

  return cleaned;
}
