/**
 * Conversational Formatter Service
 *
 * Transforms raw document chunks into warm, empathic, natural-language
 * responses — no external API key required. Extracts key points from
 * raw text, structures them with markdown, and wraps them in
 * context-appropriate conversational framing.
 */

interface FormatterInput {
  /** Raw answer text (combined chunks) */
  rawAnswer: string;
  /** Primary document source name */
  source: string;
  /** Detected intent */
  intent: string;
  /** Extracted entities */
  entities: Record<string, any>;
  /** 0-1 confidence score */
  confidence: number;
  /** Conversation history turns */
  conversationHistory?: Array<{ sender: string; text: string }>;
  /** Whether bias was detected */
  biasDetected?: boolean;
  /** Fact-check reliability */
  reliability?: string;
  /** Additional matched sources */
  additionalSources?: string[];
  /** The original user question */
  userQuestion?: string;
}

/* ------------------------------------------------------------------ */
/* Greeting / Opening helpers                                          */
/* ------------------------------------------------------------------ */

/** Intent-specific conversational openings */
const INTENT_OPENINGS: Record<string, string[]> = {
  emergency: [
    'I understand this is urgent. Let me share the most important information right away.',
    'Safety is the top priority. Here is what you need to know.'
  ],
  financial: [
    'Navigating the financial side of recovery can feel overwhelming, but there are resources available to help.',
    'I found some helpful information about financial assistance for your situation.'
  ],
  insurance: [
    'Insurance processes can be complex, so let me break down what I found for you.',
    'Here is some guidance on the insurance process that should help.'
  ],
  process: [
    'Great question! Let me walk you through what I found in the recovery resources.',
    'I found some step-by-step guidance that should help clarify this for you.'
  ],
  housing: [
    'Finding stable housing during recovery is so important. Here is what I found.',
    'I have some information about housing options that may be helpful.'
  ],
  debris: [
    'Debris removal is one of the first important steps. Here is what the guidance says.',
    'Let me share what I found about the debris removal process.'
  ],
  emotional: [
    'Recovery is not just about rebuilding structures — your well-being matters too. Here are some resources.',
    'I want you to know that support is available. Here is what I found.'
  ],
  general: [
    'Thanks for your question! Here is what I found in the recovery resources.',
    'Let me share the most relevant information I found for you.'
  ]
};

/** Closing offers to keep the conversation going */
const CLOSINGS = [
  'Would you like me to go into more detail on any of these points?',
  'Is there anything else about this topic I can help clarify?',
  'Feel free to ask follow-up questions if you need more specifics.',
  'Let me know if any of this needs further explanation.'
];

/** Pick a random element */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Map intent string to category key */
function getIntentCategory(intent: string): string {
  const lower = intent.toLowerCase();
  if (lower.includes('emergency') || lower.includes('safety') || lower.includes('urgent')) return 'emergency';
  if (lower.includes('financ') || lower.includes('fema') || lower.includes('grant') || lower.includes('aid')) return 'financial';
  if (lower.includes('insurance') || lower.includes('claim')) return 'insurance';
  if (lower.includes('process') || lower.includes('permit') || lower.includes('step') || lower.includes('how')) return 'process';
  if (lower.includes('housing') || lower.includes('shelter') || lower.includes('home') || lower.includes('rent')) return 'housing';
  if (lower.includes('debris') || lower.includes('cleanup') || lower.includes('removal')) return 'debris';
  if (lower.includes('emotion') || lower.includes('mental') || lower.includes('stress') || lower.includes('counsel')) return 'emotional';
  return 'general';
}

/* ------------------------------------------------------------------ */
/* Text extraction and restructuring                                   */
/* ------------------------------------------------------------------ */

/**
 * Extract key informational sentences from raw document chunk text.
 * Strips boilerplate, deduplicates, and picks the most relevant content.
 */
function extractKeyPoints(rawText: string): string[] {
  // Split into sentences / meaningful segments
  const segments = rawText
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 15 && s.length < 800);

  if (segments.length === 0) return [rawText.trim()];

  // Remove duplicate / near-duplicate sentences
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const seg of segments) {
    const normalized = seg.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.length < 10) continue;
    const key = normalized.substring(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(seg);
    }
  }

  // Filter out boilerplate-looking sentences
  const boilerplatePatterns = [
    /^page\s+\d+/i,
    /^table of contents/i,
    /^\d+\s*$/,
    /^copyright/i,
    /^all rights reserved/i,
    /^www\./i,
    /^https?:\/\//i
  ];
  const meaningful = unique.filter(s =>
    !boilerplatePatterns.some(p => p.test(s))
  );

  return meaningful.length > 0 ? meaningful.slice(0, 8) : unique.slice(0, 8);
}

/**
 * Format extracted key points into readable markdown.
 * Uses bullet points for multiple items, plain text for single items.
 */
function formatAsConversation(keyPoints: string[]): string {
  if (keyPoints.length === 0) return '';

  if (keyPoints.length === 1) {
    return keyPoints[0];
  }

  // Check if points look like steps (numbered or sequential)
  const hasSequence = keyPoints.some(p => /^\d+[.)]\s/.test(p) || /^step\s/i.test(p));
  if (hasSequence) {
    return keyPoints.map((p, i) => {
      // Strip existing numbering and re-number
      const cleaned = p.replace(/^\d+[.)]\s*/, '').replace(/^step\s*\d*[:.)\s]*/i, '');
      return `${i + 1}. ${cleaned}`;
    }).join('\n');
  }

  // Otherwise use bullet points
  return keyPoints.map(p => `- ${p}`).join('\n');
}

/* ------------------------------------------------------------------ */
/* Main formatter                                                      */
/* ------------------------------------------------------------------ */

/**
 * Generate a conversational response from raw document chunks.
 * No external API needed — restructures and wraps content naturally.
 */
export function formatConversationalResponse(input: FormatterInput): string {
  const parts: string[] = [];
  const category = getIntentCategory(input.intent);

  // 1. Follow-up acknowledgment
  const hasHistory = input.conversationHistory && input.conversationHistory.length > 2;
  if (hasHistory) {
    parts.push('Following up on our conversation:\n');
  }

  // 2. Conversational opening
  const openings = INTENT_OPENINGS[category] || INTENT_OPENINGS.general;
  parts.push(pick(openings));

  // 3. Confidence caveat for low-confidence answers
  if (input.confidence < 0.4) {
    parts.push('\n*Please note: I found limited information on this specific topic, so you may want to verify these details with official sources.*');
  } else if (input.confidence < 0.6) {
    parts.push('\n*This may not be a complete answer — consider checking official county resources for the latest details.*');
  }

  // 4. Extract and format the actual content
  const keyPoints = extractKeyPoints(input.rawAnswer);
  const formatted = formatAsConversation(keyPoints);
  parts.push('\n' + formatted);

  // 5. Bias notice
  if (input.biasDetected) {
    parts.push('\n*Note: This response may reflect language patterns from the source documents. We recommend considering multiple perspectives.*');
  }

  // 6. Source citation (concise)
  const allSources = [input.source, ...(input.additionalSources || [])];
  const uniqueSources = [...new Set(allSources)].filter(Boolean);
  if (uniqueSources.length > 0) {
    const sourceList = uniqueSources.slice(0, 3).map(s => `*${s}*`).join(', ');
    parts.push(`\n**Source${uniqueSources.length > 1 ? 's' : ''}:** ${sourceList}`);
  }

  // 7. Closing
  parts.push('\n' + pick(CLOSINGS));

  return parts.join('\n');
}
