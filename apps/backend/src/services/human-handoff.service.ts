/**
 * Human Handoff Service
 *
 * Escalation triggers, context transfer, expert routing
 */

export interface HandoffTrigger {
  shouldHandoff: boolean;
  reason: HandoffReason;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedExpert?: string;
  contextSummary: string;
}

export enum HandoffReason {
  LOW_CONFIDENCE = 'low_confidence',
  BIAS_DETECTED = 'bias_detected',
  HALLUCINATION_RISK = 'hallucination_risk',
  USER_FRUSTRATION = 'user_frustration',
  EMERGENCY = 'emergency',
  COMPLEX_LEGAL = 'complex_legal',
  COMPLEX_MEDICAL = 'complex_medical',
  EXPLICIT_REQUEST = 'explicit_request',
  REPEATED_CLARIFICATION = 'repeated_clarification'
}

/**
 * Check if conversation should be handed off to human
 * Feature 4: Extended with document match quality and LLM adequacy scoring
 */
export function checkHandoffTriggers(data: {
  confidence?: number;
  biasScore?: number;
  hallucinationRisk?: number;
  intent?: string;
  message?: string;
  conversationHistory?: any[];
  documentMatchQuality?: number;
  isPromptTemplate?: boolean;
  llmAdequacyScore?: number;
}): HandoffTrigger {
  // Emergency intent - highest priority
  if (data.intent === 'emergency') {
    return {
      shouldHandoff: true,
      reason: HandoffReason.EMERGENCY,
      priority: 'urgent',
      suggestedExpert: 'Emergency Services',
      contextSummary: 'User indicated emergency situation'
    };
  }

  // Feature 4: Smart confidence threshold for prompt templates
  // If LLM says docs adequately answer (score >= 3), suppress LOW_CONFIDENCE handoff
  if (data.confidence !== undefined && data.confidence < 0.60) {
    // Feature 4: Adjusted thresholds for prompt templates
    if (data.isPromptTemplate && data.llmAdequacyScore !== undefined && data.llmAdequacyScore >= 3) {
      // LLM assessed documents as adequate — don't hand off for low confidence
      console.log('Feature 4: Suppressed LOW_CONFIDENCE handoff - LLM adequacy score:', data.llmAdequacyScore);
    } else if (data.isPromptTemplate && data.documentMatchQuality !== undefined && data.documentMatchQuality > 0.6) {
      // Good document match quality for prompt template — lower threshold to 0.40
      if (data.confidence < 0.40) {
        return {
          shouldHandoff: true,
          reason: HandoffReason.LOW_CONFIDENCE,
          priority: 'high',
          suggestedExpert: 'Fire Recovery Specialist',
          contextSummary: `AI confidence ${(data.confidence * 100).toFixed(0)}% - below adjusted template threshold`
        };
      }
      // Between 0.40 and 0.60 with good doc match — don't hand off
    } else {
      return {
        shouldHandoff: true,
        reason: HandoffReason.LOW_CONFIDENCE,
        priority: 'high',
        suggestedExpert: 'Fire Recovery Specialist',
        contextSummary: `AI confidence ${(data.confidence * 100).toFixed(0)}% - below threshold`
      };
    }
  }

  // High bias detection
  if (data.biasScore !== undefined && data.biasScore > 0.6) {
    return {
      shouldHandoff: true,
      reason: HandoffReason.BIAS_DETECTED,
      priority: 'high',
      suggestedExpert: 'Quality Assurance Team',
      contextSummary: 'High bias score detected in AI response'
    };
  }

  // Hallucination risk
  if (data.hallucinationRisk !== undefined && data.hallucinationRisk > 0.6) {
    return {
      shouldHandoff: true,
      reason: HandoffReason.HALLUCINATION_RISK,
      priority: 'high',
      suggestedExpert: 'Fire Recovery Specialist',
      contextSummary: 'High hallucination risk - response may contain unverified info'
    };
  }

  // Complex legal questions
  if (data.intent === 'legal' && data.message) {
    const complexLegalIndicators = /(lawsuit|court|attorney|liability|sue|legal action)/i;
    if (complexLegalIndicators.test(data.message)) {
      return {
        shouldHandoff: true,
        reason: HandoffReason.COMPLEX_LEGAL,
        priority: 'high',
        suggestedExpert: 'Legal Advisor',
        contextSummary: 'Complex legal question detected'
      };
    }
  }

  // User frustration indicators
  if (data.message) {
    const frustrationIndicators = /(frustrated|angry|useless|not helping|waste of time|give up)/i;
    if (frustrationIndicators.test(data.message)) {
      return {
        shouldHandoff: true,
        reason: HandoffReason.USER_FRUSTRATION,
        priority: 'medium',
        suggestedExpert: 'Customer Support',
        contextSummary: 'User expressing frustration'
      };
    }
  }

  // Explicit request for human
  if (data.message) {
    const humanRequestPatterns = /(speak to|talk to|human|person|representative|agent|someone real)/i;
    if (humanRequestPatterns.test(data.message)) {
      return {
        shouldHandoff: true,
        reason: HandoffReason.EXPLICIT_REQUEST,
        priority: 'medium',
        suggestedExpert: 'Fire Recovery Specialist',
        contextSummary: 'User requested human assistance'
      };
    }
  }

  // Repeated clarifications (>3 in conversation)
  if (data.conversationHistory && data.conversationHistory.length > 6) {
    const clarificationCount = data.conversationHistory.filter((msg: any) =>
      msg.sender === 'bot' && msg.text?.includes('clarif')
    ).length;

    if (clarificationCount >= 3) {
      return {
        shouldHandoff: true,
        reason: HandoffReason.REPEATED_CLARIFICATION,
        priority: 'medium',
        suggestedExpert: 'Fire Recovery Specialist',
        contextSummary: 'Multiple clarifications requested - may need human assistance'
      };
    }
  }

  // No handoff needed
  return {
    shouldHandoff: false,
    reason: HandoffReason.LOW_CONFIDENCE, // placeholder
    priority: 'low',
    contextSummary: 'No handoff triggers detected'
  };
}

/**
 * Prepare context for human handoff
 */
export function prepareHandoffContext(data: {
  userId: number;
  userEmail: string;
  conversationHistory: any[];
  currentIntent?: string;
  detectedLocation?: string;
  detectedTopic?: string;
}): string {
  const context = `
HUMAN HANDOFF CONTEXT
=====================
User ID: ${data.userId}
Email: ${data.userEmail}
Location: ${data.detectedLocation || 'Unknown'}
Topic: ${data.detectedTopic || 'Unknown'}
Intent: ${data.currentIntent || 'Unknown'}

Conversation History:
${data.conversationHistory.map((msg, i) => `${i + 1}. [${msg.sender}]: ${msg.text}`).join('\n')}

---
Please review the conversation above and assist the user accordingly.
`;

  return context;
}

/**
 * Get handoff message for user
 */
export function getHandoffMessage(trigger: HandoffTrigger): string {
  const messages: { [key in HandoffReason]: string } = {
    [HandoffReason.LOW_CONFIDENCE]: "I want to make sure you get accurate information. Let me connect you with a fire recovery specialist who can better assist you.",
    [HandoffReason.BIAS_DETECTED]: "To ensure you receive unbiased information, I'm connecting you with a human specialist.",
    [HandoffReason.HALLUCINATION_RISK]: "To verify the information you need, I'd like to connect you with a fire recovery expert.",
    [HandoffReason.USER_FRUSTRATION]: "I apologize if I haven't been helpful. Let me connect you with a specialist who can better assist you.",
    [HandoffReason.EMERGENCY]: "This sounds urgent. I'm immediately connecting you to emergency services. If this is a life-threatening emergency, please call 911.",
    [HandoffReason.COMPLEX_LEGAL]: "Legal matters require specialized expertise. I'm connecting you with a legal advisor.",
    [HandoffReason.COMPLEX_MEDICAL]: "Medical concerns should be addressed by a professional. I'm connecting you with appropriate resources.",
    [HandoffReason.EXPLICIT_REQUEST]: "Of course! I'm connecting you with a fire recovery specialist.",
    [HandoffReason.REPEATED_CLARIFICATION]: "I want to make sure you get the help you need. Let me connect you with a specialist."
  };

  return messages[trigger.reason];
}

/**
 * Get contact information based on trigger
 */
export function getHandoffContact(trigger: HandoffTrigger, location?: string): {
  name: string;
  phone?: string;
  email?: string;
  hours?: string;
} {
  // Emergency
  if (trigger.reason === HandoffReason.EMERGENCY) {
    return {
      name: 'Emergency Services',
      phone: '911',
      hours: '24/7'
    };
  }

  // Location-specific contacts
  if (location?.toLowerCase().includes('pasadena')) {
    return {
      name: 'Pasadena Fire Recovery Helpline',
      phone: '(626) 744-4000',
      email: 'firerecovery@cityofpasadena.net',
      hours: 'Mon-Fri 8AM-5PM'
    };
  }

  // Default LA County
  return {
    name: 'LA County Fire Recovery Hotline',
    phone: '(833) 238-4450',
    email: 'firerecovery@lacounty.gov',
    hours: 'Mon-Fri 8AM-6PM'
  };
}
