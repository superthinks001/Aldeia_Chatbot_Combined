import { Router, Request, Response } from 'express';
import { ChromaClient } from 'chromadb';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ConversationsService } from '../services/conversations.service';
import { AnalyticsService } from '../services/analytics.service';
import { findAllPDFs, extractTextFromPDF, reindexAllDocuments } from '../document_ingest';
import { requireRole, requirePermission } from '../middleware/auth/authorize.middleware';
import { UserRole, Permission } from '../types/auth.types';
import { supabase } from '../config/database';
// Sprint 2 Services - Enhanced AI capabilities
import { classifyIntent as enhancedClassifyIntent, extractEntities } from '../services/nlp.service';
import { analyzeBias, correctBias } from '../services/bias-detection.service';
import { factCheck } from '../services/fact-checking.service';
import { getProactiveNotifications } from '../services/proactive-notifications.service';
import { checkHandoffTriggers, prepareHandoffContext, getHandoffMessage, getHandoffContact } from '../services/human-handoff.service';
// Sprint 3 Services - Interest-based suggestions
import { getUserSuggestions } from '../services/interest-suggestions.service';
// Audit trail for feedback and flagging
import { logAuditEvent, AuditEventType, AuditSeverity } from '../services/audit-trail.service';
// Correction deployment
import { getCorrections } from '../services/correction-deployment.service';
// Feature 1: LLM Conversational Responses
import { generateConversationalResponse, isLLMAvailable, assessDocumentAdequacy } from '../services/llm-response.service';
// Feature 1/2/3: Session Store
import { getSession, updateSession, addToHistory } from '../services/session-store.service';
// Feature 5: Feedback Weights
import { recordChunkFeedback, getChunkWeights, buildChunkId } from '../services/feedback-weight.service';
// Feature 2/3: Embedding Search
import { searchLocalEmbeddings, mergeSearchResults, SearchMatch } from '../utils/embedding-search';
// Feature 2: Document Parser
import { parseDocument } from '../services/document-parser.service';
// Feature 3: URL Scraper
import { scrapeUrl } from '../services/url-scraper.service';
// Conversational Formatter (no API key needed)
import { formatConversationalResponse } from '../services/conversational-formatter.service';
// Site Actions (navigation, uploads, preferences from chatbot)
import { detectSiteAction } from '../services/site-actions.service';

const router = Router();

let embedder: any = null;
let collection: any = null;

// Path for bias/fairness log file
const biasLogPath = path.join(__dirname, '../../bias_fairness.log');

// Initialize MiniLM and ChromaDB once
(async () => {
  try {
    // Dynamically import @xenova/transformers to handle ES module
    const { pipeline } = await (new Function('return import("@xenova/transformers")'))();
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    // Configure ChromaDB client with host and auth from environment
    const chromaHost = process.env.CHROMA_HOST || 'localhost';
    const chromaPort = process.env.CHROMA_PORT || '8000';
    const chromaAuthToken = process.env.CHROMA_AUTH_TOKEN;

    const chromaClient = new ChromaClient({
      path: `http://${chromaHost}:${chromaPort}`,
      auth: chromaAuthToken ? {
        provider: 'token',
        credentials: chromaAuthToken
      } : undefined
    });
    collection = await chromaClient.getOrCreateCollection({
      name: 'fire_recovery_chunks',
      metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
      embeddingFunction: {
        generate: async (_docs: string[]) => { throw new Error('embeddingFunction should not be called'); }
      }
    });
    console.log('ChromaDB initialized successfully');
  } catch (error) {
    console.warn('ChromaDB initialization failed, continuing without vector search:', error instanceof Error ? error.message : String(error));
    try {
      // Set embedder without ChromaDB for basic functionality
      const { pipeline } = await (new Function('return import("@xenova/transformers")'))();
      embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (embedError) {
      console.error('Failed to initialize embedder:', embedError);
    }
  }
})();

// Ensure embedder is initialized before handling requests
async function ensureInitialized() {
  if (!embedder) {
    // Wait for initialization (max 5 seconds)
    for (let i = 0; i < 10; i++) {
      if (embedder) return;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

function logErrorToFile(error: any, req: Request) {
  const logPath = path.join(__dirname, '../../error.log');
  const userId = req.user?.userId || 'anonymous';
  const logEntry = `\n[${new Date().toISOString()}]\nUser: ${userId}\nRequest: ${JSON.stringify({ url: req.url, body: req.body })}\nError: ${error instanceof Error ? error.stack : JSON.stringify(error)}\n`;
  fs.appendFileSync(logPath, logEntry);
}

function logBiasToFile(entry: any) {
  const logEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(entry)}\n`;
  fs.appendFileSync(biasLogPath, logEntry);
}

// Simple input sanitization function
function sanitizeInput(input: string): string {
  return input.replace(/[<>"'`\\]/g, '');
}

// Enhanced greeting system with warm, friendly tone
function generateGreeting(context?: string): string {
  const greetings = [
    "Hello! I'm Aldeia Advisor, your friendly guide through the fire recovery process. How can I help you today?",
    "Welcome! I'm here to support you with information about fire recovery in LA County. What would you like to know?",
    "Hi there! I'm Aldeia Advisor, ready to help you navigate the recovery process. What questions do you have?",
    "Greetings! I'm your personal assistant for fire recovery information. How may I assist you today?"
  ];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  if (context) {
    return `${randomGreeting} I can see you're looking at information about ${context}. I'm here to help clarify any questions you might have.`;
  }
  
  return randomGreeting;
}

// Legacy intent classification (kept for backward compatibility)
// Now delegates to enhanced NLP service
function classifyIntent(message: string, context?: any): string {
  const result = enhancedClassifyIntent(message, context);
  return result.primaryIntent;
}

// Legacy bias detection (kept for backward compatibility)
// Now delegates to advanced bias detection service
function detectBias(message: string): boolean {
  const analysis = analyzeBias(message);
  return analysis.detected;
}

// Improved ambiguity detection — deliberately lenient to avoid
// blocking legitimate fire-recovery questions. The NLP service
// already scores and classifies intents; this is a last-resort gate.
function detectAmbiguity(message: string, intent: string): boolean {
  if (intent === 'ambiguous') return true;
  // Only flag very short messages (1-2 words)
  if (message.trim().split(/\s+/).length < 2) return true;
  return false;
}

// Session store replaces in-memory conversationContexts (Feature 1)
// Sessions are managed by session-store.service.ts with TTL auto-cleanup
const MAX_HISTORY = 5;

// Multer for in-chat document upload (Feature 2)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExts = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are accepted'));
    }
  }
});

// Enhanced response formatting with ethical AI principles
function formatResponse(answer: string, source: string, bias: boolean): string {
  let response = '';
  response += answer;
  response += `\n\nSource: ${source}`;
  if (bias) {
    response = `⚠️ Bias Warning: This response may contain biased language or assumptions.\n\n${response}`;
  }
  return response;
}

// Generate intent-based response when no document matches are found
function generateIntentBasedResponse(intent: string, message: string, entities: any): string {
  const intentResponses: Record<string, string> = {
    process: `Based on your question about "${message}", here's a general overview of the rebuilding process:

**For fire recovery and rebuilding in LA County, you typically need to:**

1. **Initial Assessment**: Contact your local fire recovery office or FEMA for damage assessment
2. **Debris Removal**: Coordinate debris removal (may be handled by county or require private contractor)
3. **Permits**: Obtain necessary building permits from your local building department
4. **Inspections**: Schedule required inspections at various stages of rebuilding
5. **Final Approval**: Complete final inspections and obtain occupancy permits

${entities?.location ? `**For ${entities.location.charAt(0).toUpperCase() + entities.location.slice(1)} specifically:**\n- Contact your local building department for area-specific requirements\n- Check with your local fire department for fire safety regulations\n- Verify any HOA or local zoning requirements\n\n` : ''}**Important Resources:**
- LA County Building and Safety: (213) 482-7000
- FEMA Disaster Assistance: 1-800-621-3362
- LA County Office of Emergency Management: (323) 890-4000

Would you like more specific information about any of these steps?`,
    
    status: `To check the status of your fire recovery application or request, you can:

1. Contact your local fire recovery office directly
2. Check online portals if available for your county
3. Call the FEMA helpline for federal assistance status
4. Contact your insurance company for claim status

Could you provide more details about what specific status you're checking?`,
    
    financial: `For financial assistance related to fire recovery, there are several options:

1. **FEMA Assistance**: Federal emergency assistance programs
2. **Insurance Claims**: Work with your insurance provider
3. **State/Local Grants**: Check with LA County for local assistance programs
4. **Non-profit Organizations**: Various charities provide fire recovery aid

Would you like more information about any of these options?`,
    
    location: `For fire recovery information in ${entities?.location ? entities.location.charAt(0).toUpperCase() + entities.location.slice(1) : 'LA County'}:

${entities?.location?.toLowerCase().includes('altadena') ? `**For Altadena specifically:**
- Altadena is served by LA County services
- Contact the LA County Office of Emergency Management at (323) 890-4000
- Visit the LA County Fire Department for local fire recovery resources
- Check with the Altadena Community Center for local assistance programs

**Rebuilding in Altadena:**
- Building permits are handled through LA County Building and Safety
- Contact (213) 482-7000 for permit information
- You may need to coordinate with both LA County and any local HOA requirements
- Consider consulting with a local contractor familiar with Altadena building codes

` : entities?.location?.toLowerCase().includes('pasadena') ? `**For Pasadena specifically:**
- Contact Pasadena City Hall at (626) 744-4000
- Building permits: Pasadena Building and Safety Division
- Fire Department: (626) 744-4655
- Visit pasadena.gov for official fire recovery resources

` : `- **LA County Fire Recovery**: Contact the LA County Office of Emergency Management
- **Pasadena**: Contact Pasadena City Hall or the fire department  
- **Altadena**: Check with LA County services

`}You can also visit the official LA County fire recovery website for the most up-to-date information and office locations.`,
    
    emergency: `If this is an emergency, please call 911 immediately.

For urgent fire recovery assistance:
- **Emergency Services**: 911
- **FEMA Disaster Assistance**: 1-800-621-3362
- **LA County Emergency**: Check local emergency services

For non-emergency fire recovery questions, I'm here to help with information about permits, debris removal, rebuilding processes, and recovery resources.`,
    
    legal: `For legal questions about fire recovery:

1. **Legal Aid Organizations**: Contact local legal aid services
2. **Insurance Disputes**: Consult with an attorney specializing in insurance law
3. **Permit Issues**: Contact your local building department
4. **Rights and Regulations**: Review LA County fire recovery regulations

I recommend consulting with a qualified attorney for specific legal advice. Would you like general information about fire recovery regulations?`
  };

  // Return intent-specific response or generic helpful response
  const response = intentResponses[intent] || `I understand you're asking about "${message}". While I don't have specific documents matching your question, I can help you with:

- Fire recovery processes and procedures
- Debris removal information
- Rebuilding permits and inspections
- Recovery resources and assistance programs

Could you provide more details about what specific information you need? This will help me give you a more targeted answer.`;

  return response;
}

// Helper: Generate clarification options based on message and context
function generateClarificationOptions(message: string, context: any): string[] {
  const msg = message.toLowerCase();
  // Example logic: tailor to your domain
  if (/permit/.test(msg)) {
    return ['Debris removal permit', 'Rebuilding permit', 'Other permit'];
  }
  if (/support|help/.test(msg)) {
    return ['Emotional support', 'Financial support', 'Legal support'];
  }
  if (/status|progress|update/.test(msg)) {
    return ['Debris removal status', 'Rebuilding status', 'Permit status'];
  }
  if (/application|form|paperwork/.test(msg)) {
    return ['Debris removal application', 'Rebuilding application', 'Other application'];
  }
  // Fallback generic options
  return ['Can you clarify your question?', 'Can you provide more details?', 'Other'];
}

// Helper: Generate proactive notifications based on message/context
function getProactiveNotification(message: string, context: any): string | null {
  const msg = message.toLowerCase();
  const ctx = (typeof context === 'string' ? context : JSON.stringify(context || '')).toLowerCase();
  if (msg.includes('pasadena') || ctx.includes('pasadena')) {
    return 'Pasadena County: New debris removal deadline is April 30, 2025.';
  }
  if (msg.includes('la county') || ctx.includes('la county')) {
    return 'LA County: Opt-out applications for debris removal close May 15, 2025.';
  }
  if (msg.includes('deadline')) {
    return 'Reminder: Check your local county website for the latest fire recovery deadlines.';
  }
  return null;
}

router.post('/', async (req: Request, res: Response) => {
  // Get authenticated user info (optional for rebuild flow)
  const userId = req.user ? parseInt(req.user.userId) : null;
  const userEmail = req.user?.email || null;
  const isRebuildFlow = req.body.rebuildStep && ['landing', 'location', 'preferences-style', 'preferences-needs', 'inspiration', 'budget', 'matches', 'details'].includes(req.body.rebuildStep);

  let { message, context, pageUrl, isFirstMessage, conversationId, userProfile, rebuildStep, rebuildStepContext, isPromptTemplate } = req.body;
  // Sanitize all user input
  message = typeof message === 'string' ? sanitizeInput(message) : '';
  context = typeof context === 'string' ? sanitizeInput(context) : (typeof context === 'object' ? context : {});
  pageUrl = typeof pageUrl === 'string' ? sanitizeInput(pageUrl) : '';
  isFirstMessage = Boolean(isFirstMessage);
  // conversationId may be nested inside context (frontend sends it there)
  if (!conversationId && typeof context === 'object' && context?.conversationId) {
    conversationId = context.conversationId;
  }
  // isPromptTemplate may also be nested inside context
  if (!isPromptTemplate && typeof context === 'object' && context?.isPromptTemplate) {
    isPromptTemplate = context.isPromptTemplate;
  }
  conversationId = typeof conversationId === 'string' ? conversationId : null;
  
  // Add rebuild step context to context object
  if (rebuildStep) {
    if (typeof context === 'string') {
      try {
        context = JSON.parse(context);
      } catch {
        context = { original: context };
      }
    }
    context.rebuildStep = rebuildStep;
    context.rebuildStepContext = rebuildStepContext;
  }

  // Create or get conversation from database (only if authenticated)
  let conversation = null;
  if (!isFirstMessage && userId) {
    try {
      conversation = await ConversationsService.createOrGetConversation(
        userId,
        conversationId || undefined,
        undefined, // title - auto-generated later
        userProfile?.language || 'en'
      );
      // Update conversationId if new conversation was created
      if (conversation && !conversationId) {
        conversationId = conversation.id;
      }
    } catch (error) {
      console.warn('Failed to create conversation (may be unauthenticated):', error);
    }
  }

  // Track context for conversation using session store (Feature 1)
  const sessionId = conversationId || `anon-${Date.now()}`;
  const convContext = getSession(sessionId);
  if (context) {
    convContext.pageContext = context;
    if (rebuildStep) {
      convContext.rebuildStep = rebuildStep;
      convContext.rebuildStepContext = rebuildStepContext;
    }
  }
  if (message) convContext.lastUserMessage = message;
  // Store user profile if provided
  if (userProfile) {
    convContext.userProfile = { ...convContext.userProfile, ...userProfile };
  }
  // Add to history
  if (!convContext.history) convContext.history = [];
  if (message) convContext.history.push({ sender: 'user', text: message });
  // Limit history length
  if (convContext.history.length > MAX_HISTORY) convContext.history = convContext.history.slice(-MAX_HISTORY);
  updateSession(sessionId, convContext);

  // Personalized greeting
  function getPersonalizedGreeting() {
    if (convContext.userProfile && convContext.userProfile.name) {
      return `Hello, ${convContext.userProfile.name}! I'm Aldeia Advisor, your friendly guide through the fire recovery process. How can I help you today?`;
    }
    return generateGreeting(context);
  }

  // Log the incoming request for debugging
  console.log('Chat request:', { message, context, pageUrl, isFirstMessage });

  // Handle first message (greeting)
  if (isFirstMessage) {
    const greeting = getPersonalizedGreeting();
    return res.json({
      response: greeting,
      confidence: 1.0,
      bias: false,
      uncertainty: false,
      context: context || null,
      grounded: true,
      hallucination: false,
      intent: 'greeting',
      isGreeting: true
    });
  }

  // Sprint 2: Enhanced NLP intent classification
  const intentResult = enhancedClassifyIntent(message, {
    location: context?.location,
    topic: context?.topic || context?.rebuildStep,
    rebuildStep: rebuildStep || context?.rebuildStep,
    rebuildStepContext: rebuildStepContext || context?.rebuildStepContext,
    pageContext: convContext.pageContext,
    conversationHistory: convContext.history
  });
  const intent = intentResult.primaryIntent;
  const entities = intentResult.entities;
  const ambiguous = intentResult.requiresClarification || detectAmbiguity(message, intent);

  // Sprint 2: Advanced bias detection
  const biasAnalysis = analyzeBias(message);
  const bias = biasAnalysis.detected;

  // Enforce HTTPS if not already
  if (process.env.NODE_ENV === 'production') {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    if (!isSecure) {
      return res.status(403).json({ response: 'HTTPS is required for this endpoint.' });
    }
  }

  try {
    await ensureInitialized();
    if (!embedder) {
      return res.status(503).json({ response: 'I apologize, but my knowledge base is still loading. Please try again in a moment.', confidence: 0, bias, uncertainty: true, context: context || null });
    }
    // Note: collection (ChromaDB) is optional - fallback logic exists below
    
    // If user has session-local content (uploaded docs / scraped URLs),
    // skip the ambiguity check — the question likely relates to that content,
    // not to the fire-recovery domain.
    const hasSessionContent = (convContext.uploadedDocChunks && convContext.uploadedDocChunks.length > 0)
      || (convContext.scrapedUrlChunks && convContext.scrapedUrlChunks.length > 0);

    // If ambiguous, still try to provide helpful response based on intent
    // Only skip to clarification if confidence is extremely low (< 0.15)
    // AND the message is not from a prompt template
    // AND the user has no session-local content to search
    // NOTE: The NLP scoring formula produces inherently low values (keyword
    // matches divided by large keyword lists), so the threshold must be very
    // low to avoid blocking valid fire-recovery questions.
    if (ambiguous && intentResult.confidence < 0.15 && !isPromptTemplate && !hasSessionContent) {
      // Only for very unclear messages, ask for clarification
      const clarificationText = "I'd love to help you, but I'm not quite sure what you're asking. Could you please provide more details? For example:\n\n- Are you asking about the rebuilding process?\n- Do you need information about permits?\n- Are you looking for debris removal services?\n- Do you need financial assistance information?\n\nPlease provide more details and I'll be happy to help!";

      // Add bot clarification to history
      convContext.history.push({ sender: 'bot', text: clarificationText });
      updateSession(sessionId, convContext);

      // Store user message and bot clarification in database
      if (conversation && conversationId) {
        await ConversationsService.addMessage(conversationId, 'user', message, {
          intent,
          ambiguous: true,
          intentConfidence: intentResult.confidence,
          entities
        });
        await ConversationsService.addMessage(conversationId, 'bot', clarificationText, {
          intent,
          ambiguous: true,
          confidence: 0.3
        });
      }

      return res.json({
        response: clarificationText,
        confidence: intentResult.confidence,
        bias,
        biasAnalysis: biasAnalysis,
        uncertainty: true,
        context: convContext,
        grounded: false,
        hallucination: false,
        intent,
        secondaryIntents: intentResult.secondaryIntents,
        entities,
        ambiguous: true,
        history: convContext.history
      });
    }
    // If ambiguous but confidence >= 0.3, continue with intent-based response below
    
    // Feature 3: Auto-detect URLs in message and scrape them
    let messageForQuery = message;
    const urlRegex = /https?:\/\/[^\s]+/gi;
    const detectedUrls = message.match(urlRegex);
    let urlsScrapedSuccessfully = false;
    let scrapedUrlTitles: string[] = [];
    if (detectedUrls && detectedUrls.length > 0) {
      for (const url of detectedUrls.slice(0, 3)) {
        try {
          const scraped = await scrapeUrl(url);
          if (scraped.chunks.length > 0 && embedder) {
            const scrapedChunks = [];
            for (let ci = 0; ci < scraped.chunks.length; ci++) {
              const chunkEmb = await embedder(scraped.chunks[ci], { pooling: 'mean', normalize: true });
              scrapedChunks.push({
                text: scraped.chunks[ci],
                embedding: Array.from(chunkEmb.data) as number[],
                source: scraped.title || url,
                sourceType: 'scraped_url' as const,
                chunkIndex: ci,
                metadata: { url, scrapedAt: scraped.scrapedAt }
              });
            }
            // Store in session (NOT DB)
            const existingScraped = convContext.scrapedUrlChunks || [];
            convContext.scrapedUrlChunks = [...existingScraped, ...scrapedChunks];
            updateSession(sessionId, convContext);
            urlsScrapedSuccessfully = true;
            scrapedUrlTitles.push(scraped.title || url);
          }
          // Remove URL from query text so it doesn't confuse the search
          messageForQuery = messageForQuery.replace(url, '').trim();
        } catch (scrapeErr) {
          console.warn('URL scrape failed:', scrapeErr instanceof Error ? scrapeErr.message : scrapeErr);
        }
      }

      // If the message was ONLY a URL (no remaining question text), return a
      // confirmation response immediately — no need to run ChromaDB search or handoff.
      if (!messageForQuery && urlsScrapedSuccessfully) {
        const titles = scrapedUrlTitles.join(', ');
        const confirmText = `I've processed the website "${titles}". The content is now available for me to reference. What would you like to know about it?`;
        convContext.history.push({ sender: 'bot', text: confirmText });
        updateSession(sessionId, convContext);

        if (conversation && conversationId) {
          await ConversationsService.addMessage(conversationId, 'user', message, { intent, entities });
          await ConversationsService.addMessage(conversationId, 'bot', confirmText, { intent, confidence: 1.0, grounded: true });
        }

        return res.json({
          response: confirmText,
          confidence: 1.0,
          bias: false,
          uncertainty: false,
          context: context || null,
          grounded: true,
          hallucination: false,
          intent: 'url_ingestion',
          entities,
          history: convContext.history
        });
      }

      // If there's remaining query text, use it; otherwise fall back to original
      if (!messageForQuery) messageForQuery = message;
    }

    // Generate embedding for the user message, including last N turns as context
    let contextText = '';
    if (convContext.history && convContext.history.length > 1) {
      // Use last 3 turns (user+bot) as context
      const lastTurns = convContext.history.slice(-3).map((turn: any) => `${turn.sender}: ${turn.text}`).join(' | ');
      contextText = lastTurns + ' | ' + messageForQuery;
    } else {
      contextText = messageForQuery;
    }
    const embeddingTensor = await embedder(contextText, { pooling: 'mean', normalize: true });
    const embedding = Array.from(embeddingTensor.data) as number[];

    // Feature 4: Prompt templates get more results
    const nResults = isPromptTemplate ? 7 : 3;

    let matches: any[] = [];
    if (collection) {
      // Query ChromaDB for top N most similar chunks
      const results = await collection.query({
        queryEmbeddings: [embedding],
        nResults
      });
      // Log top matches for debugging
      for (let i = 0; i < Math.min(3, results.documents[0].length); i++) {
        const m = results.documents[0][i];
        console.log(`Match ${i + 1}:`, m.slice(0, 100), '| Source:', results.metadatas[0][i]?.source, '| Distance:', results.distances[0][i]);
      }
      matches = (results.documents[0] || []).map((text: string, i: number) => ({
        text,
        source: results.metadatas[0][i]?.source,
        chunk_index: results.metadatas[0][i]?.chunk_index,
        distance: results.distances[0][i],
        source_type: 'main'
      }));
    } else {
      console.log('ChromaDB not available, providing general response');
    }

    // Feature 5: Apply feedback weights to adjust distances
    if (matches.length > 0) {
      const chunkIds = matches.map((m: any) => buildChunkId(m.source, m.chunk_index));
      try {
        const weights = await getChunkWeights(chunkIds);
        for (const m of matches) {
          const cid = buildChunkId(m.source, m.chunk_index);
          const weight = weights.get(cid) || 1.0;
          if (m.distance !== undefined) {
            m.distance = m.distance / weight; // lower distance = better rank
          }
        }
        // Re-sort after applying weights
        matches.sort((a: any, b: any) => (a.distance ?? 2) - (b.distance ?? 2));
      } catch (weightErr) {
        console.warn('Feedback weights fetch failed, using raw distances:', weightErr);
      }
    }

    // Feature 2/3: Search session-local chunks (uploaded docs + scraped URLs)
    // Skip session-local chunks for prompt templates — templates should answer
    // from the main Aldeia knowledge base, not user-provided content
    if (!isPromptTemplate) {
      // Prioritize uploaded docs over scraped URLs (most recent action first)
      const uploadedChunks = convContext.uploadedDocChunks || [];
      const scrapedChunks = convContext.scrapedUrlChunks || [];
      const localChunks = [...uploadedChunks, ...scrapedChunks];

      if (localChunks.length > 0) {
        const localMatches = searchLocalEmbeddings(embedding, localChunks, 5);
        const localAsMatches = localMatches.map(lm => ({
          text: lm.text,
          source: lm.source,
          chunk_index: lm.chunkIndex,
          distance: lm.distance,
          source_type: lm.sourceType
        }));

        if (localAsMatches.length > 0) {
          // When user has session-local content, boost local results by reducing
          // their distance so they rank ahead of generic ChromaDB results.
          // This ensures questions about uploaded/scraped content get answered
          // from that content rather than the fire-recovery knowledge base.
          const boostedLocal = localAsMatches.map(m => ({
            ...m,
            distance: Math.max(0, (m.distance ?? 1) * 0.5) // boost by halving distance
          }));

          const allMatches = [...boostedLocal, ...matches];
          allMatches.sort((a: any, b: any) => (a.distance ?? 2) - (b.distance ?? 2));
          matches = allMatches.slice(0, nResults + 3);
        }
      }
    }

    // Check if the top match is good enough
    if (!matches.length || matches[0].distance === undefined || matches[0].distance > 2.0) {
      // Generate intent-based response when no good matches found
      let intentBasedResponse = generateIntentBasedResponse(intent, message, entities);

      // Feature 1: Pass through LLM if available for more natural tone,
      // otherwise use conversational formatter
      if (isLLMAvailable()) {
        try {
          const llmResult = await generateConversationalResponse({
            userMessage: message,
            retrievedChunks: [], // no good matches
            conversationHistory: convContext.history,
            intent,
            entities,
            confidence: 0.3,
            userProfile: convContext.userProfile,
            sessionId
          });
          intentBasedResponse = llmResult.conversationalResponse;
        } catch (llmErr) {
          console.warn('LLM fallback for intent response failed:', llmErr);
          // Keep the template-based response
        }
      } else {
        // Use conversational formatter for natural tone without API key
        intentBasedResponse = formatConversationalResponse({
          rawAnswer: intentBasedResponse,
          source: '',
          intent,
          entities,
          confidence: 0.3,
          conversationHistory: convContext.history,
          biasDetected: false,
          reliability: 'unverified',
          userQuestion: message
        });
      }

      // Add to conversation history
      convContext.history.push({ sender: 'bot', text: intentBasedResponse });
      updateSession(sessionId, convContext);

      // Store in database if conversation exists
      if (conversation && conversationId) {
        await ConversationsService.addMessage(conversationId, 'user', message, {
          intent,
          intentConfidence: intentResult.confidence,
          entities
        });
        await ConversationsService.addMessage(conversationId, 'bot', intentBasedResponse, {
          intent,
          confidence: 0.6,
          grounded: false
        });
      }

      return res.json({
        response: intentBasedResponse,
        confidence: 0.6,
        bias,
        uncertainty: true,
        context: context || null,
        grounded: false,
        hallucination: false,
        intent,
        intentConfidence: intentResult.confidence,
        entities,
        history: convContext.history
      });
    }
    // Calculate confidence: 1 - (distance / 2.0), clamp 0-1
    const confidence = Math.max(0, Math.min(1, 1 - (matches[0].distance ?? 2) / 2));
    // Improved keyword matching: all query words must be present
    const queryWords = message.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    let keywordMatch = matches.find((m: any) => queryWords.every((qw: string) => m.text.toLowerCase().includes(qw)));
    let selected = keywordMatch || matches[0];
    // Combine close chunks if from same doc and close in index
    const closeChunks = matches.filter((m: any) => m.source === selected.source && Math.abs(m.chunk_index - selected.chunk_index) <= 2);
    let answer = '';
    if (closeChunks.length > 1) {
      answer = closeChunks.map((m: any) => m.text).join('\n\n');
    } else {
      answer = selected.text;
    }

    // Sprint 2: Fact-checking the AI response (wrapped in try/catch for ChromaDB unavailability)
    let factCheckResult: any;
    try {
      factCheckResult = await factCheck(answer, {
        location: entities.location || context?.location,
        topic: entities.topic || context?.topic,
        intent
      });
    } catch (factCheckErr) {
      console.warn('Fact-check failed (ChromaDB may be unavailable):', factCheckErr instanceof Error ? factCheckErr.message : factCheckErr);
      factCheckResult = {
        verified: false,
        reliability: 'unverified' as const,
        hallucinationRisk: 0,
        sources: [],
        conflicts: [],
        recommendations: ['Fact-checking unavailable — verify information with official sources']
      };
    }

    // Sprint 2: Apply bias correction if needed and bias score is high
    let correctedAnswer = answer;
    if (biasAnalysis.detected && biasAnalysis.biasScore > 0.5 && biasAnalysis.correctedText) {
      correctedAnswer = biasAnalysis.correctedText;
      console.log('Applied bias correction:', { original: answer.slice(0, 100), corrected: correctedAnswer.slice(0, 100) });
    }

    // Feature 1: Generate conversational response via LLM, with fallback
    let reply: string;
    if (isLLMAvailable()) {
      try {
        const llmResult = await generateConversationalResponse({
          userMessage: message,
          retrievedChunks: matches.slice(0, 5).map((m: any) => ({
            text: m.text,
            source: m.source,
            distance: m.distance,
            sourceType: m.source_type
          })),
          conversationHistory: convContext.history,
          intent,
          entities,
          confidence,
          userProfile: convContext.userProfile,
          sessionId
        });
        reply = llmResult.conversationalResponse;
      } catch (llmErr) {
        console.warn('LLM response generation failed, falling back to conversational formatter:', llmErr);
        reply = formatConversationalResponse({
          rawAnswer: correctedAnswer,
          source: selected.source,
          intent,
          entities,
          confidence,
          conversationHistory: convContext.history,
          biasDetected: bias,
          reliability: factCheckResult.reliability,
          additionalSources: matches.slice(1, 4).map((m: any) => m.source),
          userQuestion: message
        });
      }
    } else {
      // Fallback: use conversational formatter (no API key needed)
      reply = formatConversationalResponse({
        rawAnswer: correctedAnswer,
        source: selected.source,
        intent,
        entities,
        confidence,
        conversationHistory: convContext.history,
        biasDetected: bias,
        reliability: factCheckResult.reliability,
        additionalSources: matches.slice(1, 4).map((m: any) => m.source),
        userQuestion: message
      });
    }

    // Feature 4: LLM adequacy check for prompt templates
    let llmAdequacyScore: number | undefined;
    let documentMatchQuality: number | undefined;
    if (isPromptTemplate) {
      documentMatchQuality = confidence;
      if (isLLMAvailable()) {
        try {
          llmAdequacyScore = await assessDocumentAdequacy(
            message,
            matches.slice(0, 7).map((m: any) => ({ text: m.text, source: m.source }))
          );
        } catch {
          llmAdequacyScore = undefined;
        }
      }
    }

    // Log bias if detected with enhanced details
    if (bias) {
      logBiasToFile({
        userMessage: message,
        response: reply,
        originalResponse: answer,
        correctedResponse: correctedAnswer,
        biasAnalysis: {
          score: biasAnalysis.biasScore,
          types: biasAnalysis.biasTypes,
          patterns: biasAnalysis.patterns,
          suggestions: biasAnalysis.suggestions
        },
        source: selected.source,
        chunk_index: selected.chunk_index,
        distance: selected.distance,
        timestamp: new Date().toISOString(),
        context: convContext,
        intent
      });
    }
    // Add bot reply to history
    convContext.history.push({ sender: 'bot', text: reply });
    updateSession(sessionId, convContext);

    // Find alternative perspectives (other sources)
    const alternatives = [];
    const mainSource = selected.source;
    for (const m of matches) {
      if (m.source !== mainSource && m.text && m.source) {
        alternatives.push({
          answer: m.text,
          source: m.source
        });
      }
    }
    // Sprint 2: Enhanced proactive notifications
    const notifications = getProactiveNotifications({
      location: entities.location || context?.location,
      topic: entities.topic || context?.topic,
      userHistory: convContext.history?.map((h: any) => h.text) || []
    });
    const notification = notifications.length > 0 ? notifications[0] : null;

    // Sprint 3: Interest-based suggestions
    const suggestions = getUserSuggestions({
      conversationHistory: convContext.history,
      pageContext: convContext.pageContext,
      userProfile: convContext.userProfile,
      viewedSuggestions: convContext.viewedSuggestions || []
    });

    // Sprint 2: Enhanced human handoff detection (Feature 4: with adequacy data)
    // Feature 2/3: If user has provided their own content (uploaded docs or scraped URLs)
    // and local matches are present, suppress LOW_CONFIDENCE handoff — the user is
    // feeding content and asking questions about it, not seeking expert help.
    const hasUserContent = (convContext.uploadedDocChunks && convContext.uploadedDocChunks.length > 0)
      || (convContext.scrapedUrlChunks && convContext.scrapedUrlChunks.length > 0)
      || urlsScrapedSuccessfully;
    const handoffConfidence = hasUserContent
      ? Math.max(intentResult.confidence, 0.65)
      : intentResult.confidence;
    const handoffTrigger = checkHandoffTriggers({
      confidence: handoffConfidence,
      biasScore: biasAnalysis.biasScore,
      hallucinationRisk: factCheckResult.hallucinationRisk,
      intent: intent,
      message: message,
      conversationHistory: convContext.history,
      documentMatchQuality,
      isPromptTemplate: isPromptTemplate || false,
      llmAdequacyScore
    });

    let handoffRequired = handoffTrigger.shouldHandoff;
    let handoffMessage = null;
    let handoffContact = null;

    if (handoffRequired) {
      handoffMessage = getHandoffMessage(handoffTrigger);
      handoffContact = getHandoffContact(handoffTrigger, entities.location || context?.location);
      console.log('Human handoff triggered:', {
        reason: handoffTrigger.reason,
        priority: handoffTrigger.priority,
        expert: handoffTrigger.suggestedExpert
      });
    }

    // Log user message event with Sprint 2 enhanced metadata
    await AnalyticsService.logEvent({
      user_id: userId,
      conversation_id: conversationId || undefined,
      event_type: 'user_message',
      message,
      metadata: {
        userProfile,
        userEmail,
        intent,
        intentConfidence: intentResult.confidence,
        secondaryIntents: intentResult.secondaryIntents,
        entities,
        biasDetected: bias,
        biasScore: biasAnalysis.biasScore
      }
    });

    // Store user message in conversation history with Sprint 2 metadata
    if (conversation && conversationId) {
      await ConversationsService.addMessage(
        conversationId,
        'user',
        message,
        {
          intent,
          intentConfidence: intentResult.confidence,
          secondaryIntents: intentResult.secondaryIntents,
          entities,
          confidence,
          bias,
          biasScore: biasAnalysis.biasScore,
          ambiguous
        }
      );
    }

    // When LLM is used, reply is already formatted; otherwise use legacy formatting
    // Don't double-format LLM responses
    const replyFormatted = reply;

    // Log bot response event with Sprint 2 metadata (only if authenticated)
    if (userId) {
      try {
        await AnalyticsService.logEvent({
          user_id: userId,
          conversation_id: conversationId || undefined,
          event_type: 'bot_response',
          message: replyFormatted,
          metadata: {
            intent,
            bias,
            biasScore: biasAnalysis.biasScore,
            ambiguous,
            alternatives,
            notification,
            notifications: notifications.map(n => ({ type: n.type, priority: n.priority })),
            confidence,
            factCheckReliability: factCheckResult.reliability,
            hallucinationRisk: factCheckResult.hallucinationRisk,
            handoffRequired,
            handoffReason: handoffRequired ? handoffTrigger.reason : null,
            rebuildStep: rebuildStep || null,
            rebuildStepContext: rebuildStepContext || null
          }
        });
      } catch (error) {
        console.warn('Failed to log analytics event:', error);
      }
    }

    // Log to audit trail for confidence score history tracking
    try {
      await logAuditEvent({
        eventType: AuditEventType.BOT_RESPONSE,
        severity: AuditSeverity.INFO,
        userId: userId || undefined,
        conversationId: conversationId || undefined,
        message: replyFormatted.substring(0, 500),
        details: {
          intent,
          confidence,
          sources: factCheckResult.sources?.map((s: any) => s.name) || [],
          factCheckReliability: factCheckResult.reliability,
          hallucinationRisk: factCheckResult.hallucinationRisk,
          userMessage: message.substring(0, 200)
        },
        aiDecision: {
          confidence,
          reasoning: `Intent: ${intent}, Reliability: ${factCheckResult.reliability}`
        },
        userImpact: confidence < 0.4 ? 'medium' : 'low'
      });
    } catch (auditErr) {
      console.warn('Failed to log audit event for bot response:', auditErr);
    }

    // Store bot response in conversation history with Sprint 2 metadata
    if (conversation && conversationId) {
      await ConversationsService.addMessage(
        conversationId,
        'bot',
        replyFormatted,
        {
          intent,
          confidence,
          bias,
          biasScore: biasAnalysis.biasScore,
          ambiguous,
          factCheckReliability: factCheckResult.reliability,
          hallucinationRisk: factCheckResult.hallucinationRisk,
          handoffRequired
        }
      );
    }

    // Log handoff event if needed with enhanced metadata (only if authenticated)
    if (handoffRequired && userId) {
      try {
        await AnalyticsService.logEvent({
          user_id: userId,
          conversation_id: conversationId || undefined,
          event_type: 'handoff',
          message,
          metadata: {
            reason: handoffTrigger.reason,
            priority: handoffTrigger.priority,
            suggestedExpert: handoffTrigger.suggestedExpert,
            contextSummary: handoffTrigger.contextSummary,
            rebuildStep: rebuildStep || null,
            rebuildStepContext: rebuildStepContext || null
          }
        });
      } catch (error) {
        console.warn('Failed to log analytics event:', error);
      }
    }

    // Site action detection (navigation, uploads, preferences)
    const siteAction = detectSiteAction(message, entities);
    let finalResponse = replyFormatted;
    if (siteAction.detected && siteAction.message) {
      finalResponse = siteAction.message + '\n\n' + replyFormatted;
    }

    res.json({
      response: finalResponse,
      confidence,
      bias,
      // Sprint 2: Enhanced bias analysis
      biasAnalysis: {
        detected: biasAnalysis.detected,
        score: biasAnalysis.biasScore,
        types: biasAnalysis.biasTypes,
        severity: biasAnalysis.biasScore > 0.7 ? 'high' : biasAnalysis.biasScore > 0.4 ? 'medium' : 'low',
        corrected: biasAnalysis.correctedText !== undefined
      },
      uncertainty: confidence < 0.4 || factCheckResult.reliability === 'low' || factCheckResult.reliability === 'unverified',
      context: convContext,
      grounded: factCheckResult.verified,
      // Sprint 2: Fact-checking results
      hallucination: factCheckResult.hallucinationRisk > 0.6,
      hallucinationRisk: factCheckResult.hallucinationRisk,
      factCheck: {
        verified: factCheckResult.verified,
        reliability: factCheckResult.reliability,
        sources: factCheckResult.sources.map(s => s.name),
        conflicts: factCheckResult.conflicts.length > 0 ? factCheckResult.conflicts : undefined,
        recommendations: factCheckResult.recommendations
      },
      source: selected.source,
      chunk_index: selected.chunk_index,
      distance: selected.distance,
      matches: matches.map((m: any) => ({
        text: m.text,
        source: m.source,
        chunk_index: m.chunk_index,
        score: m.distance,
        source_type: m.source_type || 'main'
      })),
      // Sprint 2: Enhanced intent classification
      intent,
      intentConfidence: intentResult.confidence,
      secondaryIntents: intentResult.secondaryIntents,
      entities,
      ambiguous: false,
      history: convContext.history,
      ...(alternatives.length > 0 ? { alternatives } : {}),
      // Sprint 2: Enhanced proactive notifications
      ...(notification ? { notification } : {}),
      ...(notifications.length > 1 ? { notifications } : {}),
      // Sprint 3: Interest-based suggestions
      ...(suggestions.length > 0 ? { suggestions } : {}),
      // Sprint 2: Enhanced human handoff
      ...(handoffRequired ? {
        handoffRequired,
        handoffReason: handoffTrigger.reason,
        handoffPriority: handoffTrigger.priority,
        handoffMessage,
        handoffContact,
        handoffExpert: handoffTrigger.suggestedExpert
      } : {}),
      // Site action for frontend
      ...(siteAction.detected ? { siteAction } : {})
    });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    logErrorToFile(err, req);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ response: 'I apologize, but something went wrong on my end. Please try again, and if the problem persists, you may want to contact support directly.' });
  }
});

router.post('/search', async (req: Request, res: Response) => {
  let { query } = req.body;
  // Sanitize input
  query = typeof query === 'string' ? sanitizeInput(query) : '';
  if (!query) {
    return res.status(400).json({ error: 'Missing query' });
  }
  try {
    if (!embedder) {
      return res.status(503).json({ error: 'Embedding model not ready' });
    }
    if (!collection) {
      return res.status(503).json({ error: 'ChromaDB not available - vector search disabled' });
    }
    // Generate embedding for the query
    const embeddingTensor = await embedder(query, { pooling: 'mean', normalize: true });
    const embedding = Array.from(embeddingTensor.data) as number[];
    // Query ChromaDB for top 5 most similar chunks
    const results = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 5
    });
    // Format results
    const matches = (results.documents[0] || []).map((text: string, i: number) => ({
      text,
      source: results.metadatas[0][i]?.source,
      chunk_index: results.metadatas[0][i]?.chunk_index,
      score: results.distances[0][i]
    }));
    // After matches are computed
    let grounded = true;
    let hallucination = false;
    if (!matches.length || (matches[0].score !== undefined && matches[0].score > 1.5)) {
      grounded = false;
      hallucination = true;
    }
    res.json({ matches, grounded, hallucination });
  } catch (err) {
    logErrorToFile(err, req);
    const errorMessage = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Search failed', details: err instanceof Error ? err.message : String(err) });
  }
});

// User feedback endpoint (Feature 5: also records chunk feedback for weights)
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { messageId, conversationId, helpful, messageText, confidence, timestamp, source, chunk_index } = req.body;
    const userId = (req as any).user?.id;

    // Log feedback to audit trail
    await logAuditEvent({
      eventType: AuditEventType.USER_MESSAGE,
      severity: AuditSeverity.INFO,
      userId: userId || undefined,
      conversationId: conversationId || undefined,
      message: `User feedback: ${helpful ? 'helpful' : 'not helpful'}`,
      details: {
        messageId,
        helpful,
        messageText,
        confidence,
        timestamp
      },
      userImpact: 'low'
    });

    // Feature 5: Record chunk-level feedback for weight adjustment
    if (source && chunk_index !== undefined) {
      try {
        await recordChunkFeedback({
          chunkId: buildChunkId(source, chunk_index),
          source,
          chunkIndex: chunk_index,
          feedbackType: helpful ? 'helpful' : 'not_helpful',
          userId: userId ? parseInt(userId) : undefined,
          conversationId: conversationId || undefined,
          messageText
        });
      } catch (fbErr) {
        console.warn('Chunk feedback recording failed:', fbErr);
      }
    }

    // Store in user_feedback table if authenticated
    if (userId) {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: userId,
          conversation_id: conversationId || null,
          message_text: messageText,
          helpful: helpful,
          satisfaction_score: helpful ? 5 : 1,
          created_at: timestamp || new Date().toISOString()
        }]);

      if (error) {
        console.error('Failed to store feedback:', error);
      }
    }

    res.json({ success: true, message: 'Feedback recorded' });
  } catch (error) {
    console.error('Feedback endpoint error:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Flag response endpoint (Feature 5: also records chunk feedback as 'flagged')
router.post('/flag-response', async (req: Request, res: Response) => {
  try {
    const { messageId, conversationId, reason, messageText, confidence, timestamp, source, chunk_index } = req.body;
    const userId = (req as any).user?.id;

    // Log flag to audit trail with high priority
    await logAuditEvent({
      eventType: AuditEventType.WARNING_TRIGGERED,
      severity: AuditSeverity.WARNING,
      userId: userId || undefined,
      conversationId: conversationId || undefined,
      message: `User flagged response: ${reason}`,
      details: {
        messageId,
        reason,
        messageText,
        confidence,
        timestamp
      },
      userImpact: 'high',
      reviewRequired: true
    });

    // Feature 5: Record chunk-level feedback as 'flagged'
    if (source && chunk_index !== undefined) {
      try {
        await recordChunkFeedback({
          chunkId: buildChunkId(source, chunk_index),
          source,
          chunkIndex: chunk_index,
          feedbackType: 'flagged',
          userId: userId ? parseInt(userId) : undefined,
          conversationId: conversationId || undefined,
          messageText,
          reason
        });
      } catch (fbErr) {
        console.warn('Chunk flag recording failed:', fbErr);
      }
    }

    res.json({ success: true, message: 'Response flagged for review' });
  } catch (error) {
    console.error('Flag endpoint error:', error);
    res.status(500).json({ error: 'Failed to flag response' });
  }
});

// Get confidence scores for user/conversation
router.get('/confidence-scores', async (req: Request, res: Response) => {
  try {
    const { conversationId, userId: userIdParam } = req.query;
    const userId = (req as any).user?.id || userIdParam;

    let query = supabase
      .from('audit_trail')
      .select('id, timestamp, message, details, ai_decision')
      .eq('event_type', AuditEventType.BOT_RESPONSE)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const scores = (data || []).map((entry: any) => {
      const aiDecision = typeof entry.ai_decision === 'string' 
        ? JSON.parse(entry.ai_decision) 
        : entry.ai_decision;
      
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        confidence: aiDecision?.confidence || 0,
        messageText: entry.message || '',
        intent: entry.details?.intent,
        sources: entry.details?.sources || []
      };
    }).filter((s: any) => s.confidence > 0);

    res.json({ scores });
  } catch (error) {
    console.error('Confidence scores endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch confidence scores' });
  }
});

// Admin endpoint to fetch last 100 bias/fairness log entries
router.get('/bias-logs', requirePermission(Permission.VIEW_SYSTEM_LOGS), async (req: Request, res: Response) => {
  try {
    if (!fs.existsSync(biasLogPath)) {
      return res.json({ logs: [] });
    }
    const data = fs.readFileSync(biasLogPath, 'utf-8');
    const entries = data.split('\n[').filter(Boolean).map(e => '[' + e).slice(-100);
    res.json({ logs: entries });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read bias/fairness logs.' });
  }
});

// Admin endpoint: analytics summary
router.get('/admin/analytics', requirePermission(Permission.READ_ADVANCED_ANALYTICS), async (req: Request, res: Response) => {
  try {
    const summary = await AnalyticsService.getOverallSummary();
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Admin endpoint: user list
router.get('/admin/users', requirePermission(Permission.ADMIN_API_ACCESS), async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, county, language, role, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json({ users: users || [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Document management endpoints
router.get('/admin/documents', requirePermission(Permission.MANAGE_CONTENT), async (req: Request, res: Response) => {
  try {
    const workspaceRoot = path.resolve(__dirname, '../../../');
    const laCountyDir = path.join(workspaceRoot, "chatbot/frontend/public/LA County");
    const pasadenaCountyDir = path.join(workspaceRoot, "chatbot/frontend/public/Pasadena County");

    const laCountyPDFs = findAllPDFs(laCountyDir).map((pdf: string) => ({
      path: pdf,
      name: path.basename(pdf),
      county: 'LA County',
      indexed: true // Assume indexed for now
    }));
    const pasadenaCountyPDFs = findAllPDFs(pasadenaCountyDir).map((pdf: string) => ({
      path: pdf,
      name: path.basename(pdf),
      county: 'Pasadena County',
      indexed: true // Assume indexed for now
    }));

    res.json({ documents: [...laCountyPDFs, ...pasadenaCountyPDFs] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/admin/documents/reindex', requirePermission(Permission.MANAGE_CONTENT), async (req: Request, res: Response) => {
  try {
    const result = await reindexAllDocuments();
    res.json({ message: 'Document reindexing completed', result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to trigger reindexing', details: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/admin/documents/upload', requirePermission(Permission.MANAGE_CONTENT), async (req: Request, res: Response) => {
  try {
    // Handle file upload (placeholder for now)
    res.json({ message: 'File upload endpoint - implementation pending' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get corrections for a message
router.get('/corrections/:messageId', async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const corrections = await getCorrections(messageId);
    res.json({ corrections });
  } catch (error) {
    console.error('Corrections endpoint error:', error);
    res.status(500).json({ error: 'Failed to fetch corrections' });
  }
});

// ============================================
// Feature 2: Document Upload in Chat
// ============================================
router.post('/upload-document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const { conversationId } = req.body;
    const userId = req.user ? parseInt(req.user.userId) : null;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    await ensureInitialized();
    if (!embedder) {
      return res.status(503).json({ error: 'Embedding model not ready' });
    }

    // Parse the document
    const parsed = await parseDocument(file.buffer, file.originalname, file.mimetype);

    if (!parsed.chunks.length) {
      return res.status(400).json({ error: 'Could not extract text from document' });
    }

    // Enforce limits: max 1000 chunks
    const chunks = parsed.chunks.slice(0, 1000);

    // Embed all chunks
    const embeddedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunkEmb = await embedder(chunks[i], { pooling: 'mean', normalize: true });
      embeddedChunks.push({
        text: chunks[i],
        embedding: Array.from(chunkEmb.data) as number[],
        source: file.originalname,
        sourceType: 'user_upload' as const,
        chunkIndex: i,
        metadata: { uploadedAt: new Date().toISOString() }
      });
    }

    // Store in session for immediate search
    const sessionId = conversationId || `anon-${Date.now()}`;
    const session = getSession(sessionId);
    const existing = session.uploadedDocChunks || [];

    // Enforce limit: max 5 documents worth of chunks
    const maxChunks = 1000;
    const newChunks = [...existing, ...embeddedChunks].slice(0, maxChunks);
    updateSession(sessionId, { uploadedDocChunks: newChunks });

    // Also try to store in per-user ChromaDB collection if available
    if (collection && userId) {
      try {
        const chromaClient = new ChromaClient();
        const userCollection = await chromaClient.getOrCreateCollection({
          name: `user_${userId}_docs`,
          metadata: { description: `User ${userId} uploaded documents` },
          embeddingFunction: {
            generate: async (_docs: string[]) => { throw new Error('embeddingFunction should not be called'); }
          }
        });

        const ids = embeddedChunks.map((_, i) => `${file.originalname}_chunk_${i}_${Date.now()}`);
        const embeddings = embeddedChunks.map(c => c.embedding);
        const documents = embeddedChunks.map(c => c.text);
        const metadatas = embeddedChunks.map((c, i) => ({
          source: file.originalname,
          chunk_index: i,
          uploaded_at: new Date().toISOString(),
          source_type: 'user_upload'
        }));

        await userCollection.add({ ids, embeddings, documents, metadatas });
      } catch (chromaErr) {
        console.warn('Failed to store in user ChromaDB collection:', chromaErr);
        // Session store still has the chunks, so search will still work
      }
    }

    res.json({
      success: true,
      filename: file.originalname,
      chunkCount: chunks.length
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// ============================================
// Feature 3: URL Scraping in Chat
// ============================================
router.post('/add-url', async (req: Request, res: Response) => {
  try {
    const { url, conversationId } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    await ensureInitialized();
    if (!embedder) {
      return res.status(503).json({ error: 'Embedding model not ready' });
    }

    const sessionId = conversationId || `anon-${Date.now()}`;
    const session = getSession(sessionId);

    // Enforce limit: max 3 URLs per session
    const existingUrlCount = (session.scrapedUrlChunks || [])
      .reduce((sources: Set<string>, c) => { sources.add(c.source); return sources; }, new Set<string>()).size;
    if (existingUrlCount >= 3) {
      return res.status(400).json({ error: 'Maximum 3 URLs per session' });
    }

    // Scrape the URL
    const scraped = await scrapeUrl(url);

    if (!scraped.chunks.length) {
      return res.status(400).json({ error: 'Could not extract content from URL' });
    }

    // Embed all chunks
    const embeddedChunks = [];
    for (let i = 0; i < scraped.chunks.length; i++) {
      const chunkEmb = await embedder(scraped.chunks[i], { pooling: 'mean', normalize: true });
      embeddedChunks.push({
        text: scraped.chunks[i],
        embedding: Array.from(chunkEmb.data) as number[],
        source: scraped.title || url,
        sourceType: 'scraped_url' as const,
        chunkIndex: i,
        metadata: { url, scrapedAt: scraped.scrapedAt }
      });
    }

    // Store in session (NOT in DB per spec)
    const existingScraped = session.scrapedUrlChunks || [];
    updateSession(sessionId, {
      scrapedUrlChunks: [...existingScraped, ...embeddedChunks]
    });

    res.json({
      success: true,
      title: scraped.title,
      chunkCount: scraped.chunks.length
    });
  } catch (error) {
    console.error('URL scraping error:', error);
    const message = error instanceof Error ? error.message : 'Failed to scrape URL';
    res.status(500).json({ error: message });
  }
});

export default router;
