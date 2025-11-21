/**
 * Enhanced NLP Intent Classification Service
 *
 * Target: 97%+ accuracy in intent detection
 * Features:
 * - Multi-intent detection
 * - Contextual intent refinement
 * - Confidence scoring
 * - Entity extraction
 * - Semantic similarity matching
 */

export interface IntentResult {
  primaryIntent: string;
  secondaryIntents: string[];
  confidence: number;
  entities: {
    location?: string;
    dateTime?: string;
    documentType?: string;
    topic?: string;
  };
  requiresClarification: boolean;
  suggestedClarifications?: string[];
}

// Comprehensive intent patterns with weights
const INTENT_PATTERNS = {
  emergency: {
    keywords: ['emergency', 'urgent', 'help', 'fire', 'evacuate', 'danger', '911', 'immediate', 'now', 'asap', 'critical', 'life', 'safety', 'hazard'],
    patterns: [
      /emergency|urgent|immediate/i,
      /need\s+help\s+(now|immediately|asap)/i,
      /danger|hazard|unsafe/i,
    ],
    weight: 1.0, // Highest priority
    minConfidence: 0.85
  },
  status: {
    keywords: ['status', 'progress', 'update', 'current', 'ongoing', 'pending', 'complete', 'finished', 'timeline', 'when', 'how long', 'duration', 'track', 'check'],
    patterns: [
      /(what|where)\s+is\s+(the\s+)?status/i,
      /when\s+(will|can|should)/i,
      /how\s+long/i,
      /is\s+(it|this|my)\s+(complete|done|finished)/i,
    ],
    weight: 0.9,
    minConfidence: 0.75
  },
  process: {
    keywords: ['how', 'process', 'steps', 'procedure', 'apply', 'application', 'submit', 'get', 'obtain', 'rebuild', 'remove', 'opt-out', 'permit', 'inspection', 'documentation', 'form', 'paperwork'],
    patterns: [
      /how\s+(do|can|should)\s+i/i,
      /what\s+(are\s+the\s+)?steps/i,
      /application\s+process/i,
      /how\s+to\s+(apply|get|obtain)/i,
    ],
    weight: 0.9,
    minConfidence: 0.75
  },
  comparative: {
    keywords: ['compare', 'difference', 'vs', 'versus', 'better', 'worse', 'best', 'cheaper', 'faster', 'option', 'choice', 'alternative'],
    patterns: [
      /what.*difference.*between/i,
      /(which|what)\s+is\s+(better|best|cheaper|faster)/i,
      /compare|versus|vs\.?/i,
    ],
    weight: 0.8,
    minConfidence: 0.70
  },
  location: {
    keywords: ['where', 'location', 'address', 'area', 'region', 'county', 'city', 'zip', 'altadena', 'pasadena', 'los angeles', 'directions', 'map'],
    patterns: [
      /where\s+(is|can|should)/i,
      /(altadena|pasadena|los\s+angeles|la\s+county)/i,
      /address|location|directions/i,
    ],
    weight: 0.85,
    minConfidence: 0.70
  },
  legal: {
    keywords: ['legal', 'law', 'regulation', 'compliance', 'requirement', 'policy', 'rule', 'attorney', 'court', 'rights', 'liability', 'lawsuit'],
    patterns: [
      /legal|law|regulation/i,
      /am\s+i\s+(required|obligated)/i,
      /rights|liability/i,
    ],
    weight: 0.85,
    minConfidence: 0.75
  },
  financial: {
    keywords: ['money', 'cost', 'fee', 'price', 'pay', 'fund', 'grant', 'insurance', 'financial', 'compensation', 'reimburse', 'budget', 'afford'],
    patterns: [
      /how\s+much/i,
      /cost|price|fee/i,
      /insurance|financial|fund|grant/i,
    ],
    weight: 0.85,
    minConfidence: 0.75
  },
  emotional_support: {
    keywords: ['support', 'counseling', 'mental', 'emotional', 'stress', 'trauma', 'wellbeing', 'well-being', 'anxiety', 'depression', 'overwhelmed', 'cope'],
    patterns: [
      /mental\s+(health|support)/i,
      /feeling\s+(overwhelmed|anxious|depressed)/i,
      /emotional\s+support/i,
    ],
    weight: 0.9, // High priority for well-being
    minConfidence: 0.75
  },
  eligibility: {
    keywords: ['eligible', 'eligibility', 'qualify', 'criteria', 'who can', 'who is', 'requirements', 'conditions'],
    patterns: [
      /am\s+i\s+eligible/i,
      /do\s+i\s+qualify/i,
      /(who|what)\s+(can|qualifies)/i,
    ],
    weight: 0.85,
    minConfidence: 0.75
  },
  contact: {
    keywords: ['contact', 'phone', 'email', 'reach', 'call', 'speak', 'talk', 'address', 'office', 'visit', 'hours'],
    patterns: [
      /contact|phone|email/i,
      /(how|where)\s+(can|do)\s+i\s+(reach|contact|call)/i,
      /office\s+hours/i,
    ],
    weight: 0.8,
    minConfidence: 0.70
  },
  feedback: {
    keywords: ['feedback', 'complaint', 'suggestion', 'report', 'issue', 'problem', 'concern', 'dissatisfied'],
    patterns: [
      /feedback|complaint|concern/i,
      /i\s+(want|need)\s+to\s+report/i,
      /(have|experiencing)\s+(issue|problem)/i,
    ],
    weight: 0.8,
    minConfidence: 0.70
  },
  information: {
    keywords: ['what', 'tell me', 'explain', 'information', 'details', 'about', 'learn'],
    patterns: [
      /what\s+is/i,
      /tell\s+me\s+about/i,
      /explain/i,
    ],
    weight: 0.6, // Lower priority, catch-all
    minConfidence: 0.60
  }
};

/**
 * Enhanced intent classification with multi-intent detection
 */
export function classifyIntent(message: string, context?: any): IntentResult {
  const msg = message.toLowerCase().trim();

  // Check for empty or very short messages
  if (msg.length < 3 || msg.split(' ').length === 1) {
    return {
      primaryIntent: 'ambiguous',
      secondaryIntents: [],
      confidence: 0.3,
      entities: {},
      requiresClarification: true,
      suggestedClarifications: ['Could you provide more details?', 'What specifically would you like to know?']
    };
  }

  // Score each intent
  const intentScores: { [intent: string]: number } = {};

  for (const [intent, config] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;

    // Keyword matching (weighted)
    const keywordMatches = config.keywords.filter(keyword => msg.includes(keyword.toLowerCase()));
    score += (keywordMatches.length / config.keywords.length) * 0.5;

    // Pattern matching (weighted)
    const patternMatches = config.patterns.filter(pattern => pattern.test(msg));
    score += (patternMatches.length / config.patterns.length) * 0.5;

    // Apply intent weight
    score *= config.weight;

    // Boost score if context matches
    if (context?.topic && intent === context.topic.replace(/-/g, '_')) {
      score *= 1.2; // 20% boost for contextual match
    }

    intentScores[intent] = score;
  }

  // Sort by score
  const sortedIntents = Object.entries(intentScores)
    .sort((a, b) => b[1] - a[1])
    .filter(([_, score]) => score > 0.2); // Filter out very low scores

  if (sortedIntents.length === 0) {
    return {
      primaryIntent: 'information',
      secondaryIntents: [],
      confidence: 0.4,
      entities: extractEntities(message, context),
      requiresClarification: true,
      suggestedClarifications: ['What would you like to know?', 'How can I help you?']
    };
  }

  const primaryIntent = sortedIntents[0][0];
  const primaryScore = sortedIntents[0][1];
  const secondaryIntents = sortedIntents.slice(1, 3).map(([intent, _]) => intent);

  // Calculate confidence (normalize to 0-1 range)
  const confidence = Math.min(primaryScore, 1.0);

  // Check if clarification is needed
  const requiresClarification = detectAmbiguity(message, primaryIntent, confidence, secondaryIntents);

  return {
    primaryIntent,
    secondaryIntents,
    confidence,
    entities: extractEntities(message, context),
    requiresClarification,
    suggestedClarifications: requiresClarification ? generateClarifications(primaryIntent, secondaryIntents, message) : undefined
  };
}

/**
 * Extract named entities from message
 */
export function extractEntities(message: string, context?: any): IntentResult['entities'] {
  const entities: IntentResult['entities'] = {};

  // Location extraction
  const locations = ['altadena', 'pasadena', 'los angeles', 'la county', 'glendale', 'burbank'];
  for (const loc of locations) {
    if (message.toLowerCase().includes(loc)) {
      entities.location = loc;
      break;
    }
  }

  // Use context location if available
  if (!entities.location && context?.location) {
    entities.location = context.location;
  }

  // DateTime extraction (simple patterns)
  const datePatterns = [
    /today|tomorrow|yesterday/i,
    /next\s+(week|month)/i,
    /in\s+\d+\s+(days?|weeks?|months?)/i,
    /by\s+[a-z]+\s+\d+/i // "by January 15"
  ];

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      entities.dateTime = match[0];
      break;
    }
  }

  // Document type extraction
  const docTypes = ['permit', 'form', 'application', 'certificate', 'inspection', 'report'];
  for (const docType of docTypes) {
    if (message.toLowerCase().includes(docType)) {
      entities.documentType = docType;
      break;
    }
  }

  // Topic extraction from context
  if (context?.topic) {
    entities.topic = context.topic;
  }

  return entities;
}

/**
 * Detect if query is ambiguous
 */
function detectAmbiguity(message: string, primaryIntent: string, confidence: number, secondaryIntents: string[]): boolean {
  // Low confidence threshold
  if (confidence < 0.65) return true;

  // Very short messages
  if (message.split(' ').length < 3) return true;

  // Multiple high-scoring intents (conflict)
  if (secondaryIntents.length >= 2 && confidence < 0.80) return true;

  // Vague language
  const vaguePatterns = [/thing|stuff|info|information|details|something|anything/i];
  if (vaguePatterns.some(p => p.test(message)) && message.split(' ').length < 6) return true;

  return false;
}

/**
 * Generate clarification questions
 */
function generateClarifications(primaryIntent: string, secondaryIntents: string[], message: string): string[] {
  const clarifications: string[] = [];

  // Intent-specific clarifications
  const intentClarifications: { [key: string]: string[] } = {
    process: [
      'Are you asking about the application process?',
      'Do you need step-by-step instructions?',
      'Which specific process are you interested in?'
    ],
    status: [
      'Are you checking the status of debris removal?',
      'Are you tracking a permit application?',
      'Which specific status are you inquiring about?'
    ],
    location: [
      'Which area are you asking about? (Altadena, Pasadena, LA County)',
      'Are you looking for office locations?',
      'Do you need directions to a specific location?'
    ],
    financial: [
      'Are you asking about costs or fees?',
      'Are you looking for financial assistance programs?',
      'Do you need insurance information?'
    ],
    contact: [
      'Would you like contact information for LA County?',
      'Are you looking for Pasadena County contacts?',
      'Do you need emergency contact numbers?'
    ]
  };

  // Add primary intent clarifications
  if (intentClarifications[primaryIntent]) {
    clarifications.push(...intentClarifications[primaryIntent].slice(0, 2));
  }

  // Add secondary intent options if available
  if (secondaryIntents.length > 0 && secondaryIntents[0] !== primaryIntent) {
    const secondaryName = secondaryIntents[0].replace(/_/g, ' ');
    clarifications.push(`Or are you asking about ${secondaryName}?`);
  }

  // Fallback clarification
  if (clarifications.length === 0) {
    clarifications.push('Could you please provide more details about what you need?');
  }

  return clarifications.slice(0, 3); // Max 3 clarifications
}

/**
 * Get intent display name
 */
export function getIntentDisplayName(intent: string): string {
  const displayNames: { [key: string]: string } = {
    emergency: 'Emergency Assistance',
    status: 'Status Check',
    process: 'Process Information',
    comparative: 'Comparison',
    location: 'Location Information',
    legal: 'Legal Information',
    financial: 'Financial Information',
    emotional_support: 'Emotional Support',
    eligibility: 'Eligibility Check',
    contact: 'Contact Information',
    feedback: 'Feedback/Complaint',
    information: 'General Information',
    ambiguous: 'Unclear Query'
  };

  return displayNames[intent] || intent.replace(/_/g, ' ');
}

/**
 * Calculate overall NLP confidence
 */
export function calculateNLPConfidence(intentResult: IntentResult, contextMatch: boolean): number {
  let confidence = intentResult.confidence;

  // Boost for context match
  if (contextMatch) {
    confidence *= 1.15;
  }

  // Penalty for ambiguity
  if (intentResult.requiresClarification) {
    confidence *= 0.8;
  }

  // Boost for entity extraction
  const entityCount = Object.keys(intentResult.entities).length;
  if (entityCount > 0) {
    confidence *= (1 + (entityCount * 0.05));
  }

  return Math.min(confidence, 1.0);
}
