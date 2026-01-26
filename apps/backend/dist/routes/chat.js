"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chromadb_1 = require("chromadb");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const conversations_service_1 = require("../services/conversations.service");
const analytics_service_1 = require("../services/analytics.service");
const document_ingest_1 = require("../document_ingest");
const authorize_middleware_1 = require("../middleware/auth/authorize.middleware");
const auth_types_1 = require("../types/auth.types");
const database_1 = require("../config/database");
// Sprint 2 Services - Enhanced AI capabilities
const nlp_service_1 = require("../services/nlp.service");
const bias_detection_service_1 = require("../services/bias-detection.service");
const fact_checking_service_1 = require("../services/fact-checking.service");
const proactive_notifications_service_1 = require("../services/proactive-notifications.service");
const human_handoff_service_1 = require("../services/human-handoff.service");
// Sprint 3 Services - Interest-based suggestions
const interest_suggestions_service_1 = require("../services/interest-suggestions.service");
const router = (0, express_1.Router)();
let embedder = null;
let collection = null;
// Path for bias/fairness log file
const biasLogPath = path_1.default.join(__dirname, '../../bias_fairness.log');
// Initialize MiniLM and ChromaDB once
(async () => {
    try {
        // Dynamically import @xenova/transformers to handle ES module
        const { pipeline } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        const chromaClient = new chromadb_1.ChromaClient();
        collection = await chromaClient.getOrCreateCollection({
            name: 'fire_recovery_chunks',
            metadata: { description: 'Paragraph chunks from LA/Pasadena County fire recovery PDFs' },
            embeddingFunction: {
                generate: async (_docs) => { throw new Error('embeddingFunction should not be called'); }
            }
        });
        console.log('ChromaDB initialized successfully');
    }
    catch (error) {
        console.warn('ChromaDB initialization failed, continuing without vector search:', error instanceof Error ? error.message : String(error));
        try {
            // Set embedder without ChromaDB for basic functionality
            const { pipeline } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
            embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }
        catch (embedError) {
            console.error('Failed to initialize embedder:', embedError);
        }
    }
})();
// Ensure embedder is initialized before handling requests
async function ensureInitialized() {
    if (!embedder) {
        // Wait for initialization (max 5 seconds)
        for (let i = 0; i < 10; i++) {
            if (embedder)
                return;
            await new Promise(r => setTimeout(r, 500));
        }
    }
}
function logErrorToFile(error, req) {
    const logPath = path_1.default.join(__dirname, '../../error.log');
    const userId = req.user?.userId || 'anonymous';
    const logEntry = `\n[${new Date().toISOString()}]\nUser: ${userId}\nRequest: ${JSON.stringify({ url: req.url, body: req.body })}\nError: ${error instanceof Error ? error.stack : JSON.stringify(error)}\n`;
    fs_1.default.appendFileSync(logPath, logEntry);
}
function logBiasToFile(entry) {
    const logEntry = `\n[${new Date().toISOString()}]\n${JSON.stringify(entry)}\n`;
    fs_1.default.appendFileSync(biasLogPath, logEntry);
}
// Simple input sanitization function
function sanitizeInput(input) {
    return input.replace(/[<>"'`\\]/g, '');
}
// Enhanced greeting system with warm, friendly tone
function generateGreeting(context) {
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
function classifyIntent(message, context) {
    const result = (0, nlp_service_1.classifyIntent)(message, context);
    return result.primaryIntent;
}
// Legacy bias detection (kept for backward compatibility)
// Now delegates to advanced bias detection service
function detectBias(message) {
    const analysis = (0, bias_detection_service_1.analyzeBias)(message);
    return analysis.detected;
}
// Improved ambiguity detection
function detectAmbiguity(message, intent) {
    const msg = message.toLowerCase();
    if (intent === 'ambiguous')
        return true;
    if (message.trim().split(' ').length < 3)
        return true;
    // Conflicting intents: e.g., both 'where' and 'how', or 'legal' and 'financial'
    const intentPatterns = [
        /where/, /how/, /legal|law|regulation/, /money|cost|fee|financial/, /support|counseling|mental/, /eligible|eligibility/, /contact|phone|email/, /feedback|complaint/
    ];
    let matches = 0;
    for (const pat of intentPatterns) {
        if (pat.test(msg))
            matches++;
    }
    if (matches > 1)
        return true;
    // Vague queries
    if (/thing|stuff|info|information|details|something|anything/.test(msg) && msg.split(' ').length < 6)
        return true;
    return false;
}
// In-memory context tracking (for demo; use Redis/db for production)
const conversationContexts = {};
const MAX_HISTORY = 5;
// Enhanced response formatting with ethical AI principles
function formatResponse(answer, source, bias) {
    let response = '';
    response += answer;
    response += `\n\nSource: ${source}`;
    if (bias) {
        response = `⚠️ Bias Warning: This response may contain biased language or assumptions.\n\n${response}`;
    }
    return response;
}
// Generate intent-based response when no document matches are found
function generateIntentBasedResponse(intent, message, entities) {
    const intentResponses = {
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
function generateClarificationOptions(message, context) {
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
function getProactiveNotification(message, context) {
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
router.post('/', async (req, res) => {
    // Get authenticated user info (optional for rebuild flow)
    const userId = req.user ? parseInt(req.user.userId) : null;
    const userEmail = req.user?.email || null;
    const isRebuildFlow = req.body.rebuildStep && ['landing', 'location', 'preferences-style', 'preferences-needs', 'inspiration', 'budget', 'matches', 'details'].includes(req.body.rebuildStep);
    let { message, context, pageUrl, isFirstMessage, conversationId, userProfile, rebuildStep, rebuildStepContext } = req.body;
    // Sanitize all user input
    message = typeof message === 'string' ? sanitizeInput(message) : '';
    context = typeof context === 'string' ? sanitizeInput(context) : (typeof context === 'object' ? context : {});
    pageUrl = typeof pageUrl === 'string' ? sanitizeInput(pageUrl) : '';
    isFirstMessage = Boolean(isFirstMessage);
    conversationId = typeof conversationId === 'string' ? conversationId : null;
    // Add rebuild step context to context object
    if (rebuildStep) {
        if (typeof context === 'string') {
            try {
                context = JSON.parse(context);
            }
            catch {
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
            conversation = await conversations_service_1.ConversationsService.createOrGetConversation(userId, conversationId || undefined, undefined, // title - auto-generated later
            userProfile?.language || 'en');
            // Update conversationId if new conversation was created
            if (conversation && !conversationId) {
                conversationId = conversation.id;
            }
        }
        catch (error) {
            console.warn('Failed to create conversation (may be unauthenticated):', error);
        }
    }
    // Track context for conversation
    let convContext = conversationId ? (conversationContexts[conversationId] || { history: [] }) : { history: [] };
    if (context) {
        convContext.pageContext = context;
        if (rebuildStep) {
            convContext.rebuildStep = rebuildStep;
            convContext.rebuildStepContext = rebuildStepContext;
        }
    }
    if (message)
        convContext.lastUserMessage = message;
    // Store user profile if provided
    if (userProfile) {
        convContext.userProfile = { ...convContext.userProfile, ...userProfile };
    }
    // Add to history
    if (!convContext.history)
        convContext.history = [];
    if (message)
        convContext.history.push({ sender: 'user', text: message });
    // Limit history length
    if (convContext.history.length > MAX_HISTORY)
        convContext.history = convContext.history.slice(-MAX_HISTORY);
    if (conversationId)
        conversationContexts[conversationId] = convContext;
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
    const intentResult = (0, nlp_service_1.classifyIntent)(message, {
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
    const biasAnalysis = (0, bias_detection_service_1.analyzeBias)(message);
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
        // If ambiguous, still try to provide helpful response based on intent
        // Only skip to clarification if confidence is extremely low (< 0.3)
        if (ambiguous && intentResult.confidence < 0.3) {
            // Only for very unclear messages, ask for clarification
            const clarificationText = "I'd love to help you, but I'm not quite sure what you're asking. Could you please provide more details? For example:\n\n- Are you asking about the rebuilding process?\n- Do you need information about permits?\n- Are you looking for debris removal services?\n- Do you need financial assistance information?\n\nPlease provide more details and I'll be happy to help!";
            // Add bot clarification to history
            convContext.history.push({ sender: 'bot', text: clarificationText });
            if (conversationId)
                conversationContexts[conversationId] = convContext;
            // Store user message and bot clarification in database
            if (conversation && conversationId) {
                await conversations_service_1.ConversationsService.addMessage(conversationId, 'user', message, {
                    intent,
                    ambiguous: true,
                    intentConfidence: intentResult.confidence,
                    entities
                });
                await conversations_service_1.ConversationsService.addMessage(conversationId, 'bot', clarificationText, {
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
        // Generate embedding for the user message, including last N turns as context
        let contextText = '';
        if (convContext.history && convContext.history.length > 1) {
            // Use last 3 turns (user+bot) as context
            const lastTurns = convContext.history.slice(-3).map((turn) => `${turn.sender}: ${turn.text}`).join(' | ');
            contextText = lastTurns + ' | ' + message;
        }
        else {
            contextText = message;
        }
        const embeddingTensor = await embedder(contextText, { pooling: 'mean', normalize: true });
        const embedding = Array.from(embeddingTensor.data);
        let matches = [];
        if (collection) {
            // Query ChromaDB for top 3 most similar chunks
            const results = await collection.query({
                queryEmbeddings: [embedding],
                nResults: 3
            });
            // Log top 3 matches for debugging
            for (let i = 0; i < Math.min(3, results.documents[0].length); i++) {
                const m = results.documents[0][i];
                console.log(`Match ${i + 1}:`, m.slice(0, 100), '| Source:', results.metadatas[0][i]?.source, '| Distance:', results.distances[0][i]);
            }
            matches = (results.documents[0] || []).map((text, i) => ({
                text,
                source: results.metadatas[0][i]?.source,
                chunk_index: results.metadatas[0][i]?.chunk_index,
                distance: results.distances[0][i]
            }));
        }
        else {
            console.log('ChromaDB not available, providing general response');
        }
        // Check if the top match is good enough
        if (!matches.length || matches[0].distance === undefined || matches[0].distance > 2.0) {
            // Generate intent-based response when no good matches found
            const intentBasedResponse = generateIntentBasedResponse(intent, message, entities);
            // Add to conversation history
            convContext.history.push({ sender: 'bot', text: intentBasedResponse });
            if (conversationId)
                conversationContexts[conversationId] = convContext;
            // Store in database if conversation exists
            if (conversation && conversationId) {
                await conversations_service_1.ConversationsService.addMessage(conversationId, 'user', message, {
                    intent,
                    intentConfidence: intentResult.confidence,
                    entities
                });
                await conversations_service_1.ConversationsService.addMessage(conversationId, 'bot', intentBasedResponse, {
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
        const queryWords = message.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let keywordMatch = matches.find((m) => queryWords.every((qw) => m.text.toLowerCase().includes(qw)));
        let selected = keywordMatch || matches[0];
        // Combine close chunks if from same doc and close in index
        const closeChunks = matches.filter((m) => m.source === selected.source && Math.abs(m.chunk_index - selected.chunk_index) <= 2);
        let answer = '';
        if (closeChunks.length > 1) {
            answer = closeChunks.map((m) => m.text).join('\n\n');
        }
        else {
            answer = selected.text;
        }
        // Sprint 2: Fact-checking the AI response
        const factCheckResult = await (0, fact_checking_service_1.factCheck)(answer, {
            location: entities.location || context?.location,
            topic: entities.topic || context?.topic,
            intent
        });
        // Sprint 2: Apply bias correction if needed and bias score is high
        let correctedAnswer = answer;
        if (biasAnalysis.detected && biasAnalysis.biasScore > 0.5 && biasAnalysis.correctedText) {
            correctedAnswer = biasAnalysis.correctedText;
            console.log('Applied bias correction:', { original: answer.slice(0, 100), corrected: correctedAnswer.slice(0, 100) });
        }
        // Use enhanced response formatting
        const reply = formatResponse(correctedAnswer, selected.source, bias);
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
        if (conversationId)
            conversationContexts[conversationId] = convContext;
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
        const notifications = (0, proactive_notifications_service_1.getProactiveNotifications)({
            location: entities.location || context?.location,
            topic: entities.topic || context?.topic,
            userHistory: convContext.history?.map((h) => h.text) || []
        });
        const notification = notifications.length > 0 ? notifications[0] : null;
        // Sprint 3: Interest-based suggestions
        const suggestions = (0, interest_suggestions_service_1.getUserSuggestions)({
            conversationHistory: convContext.history,
            pageContext: convContext.pageContext,
            userProfile: convContext.userProfile,
            viewedSuggestions: convContext.viewedSuggestions || []
        });
        // Sprint 2: Enhanced human handoff detection
        const handoffTrigger = (0, human_handoff_service_1.checkHandoffTriggers)({
            confidence: intentResult.confidence,
            biasScore: biasAnalysis.biasScore,
            hallucinationRisk: factCheckResult.hallucinationRisk,
            intent: intent,
            message: message,
            conversationHistory: convContext.history
        });
        let handoffRequired = handoffTrigger.shouldHandoff;
        let handoffMessage = null;
        let handoffContact = null;
        if (handoffRequired) {
            handoffMessage = (0, human_handoff_service_1.getHandoffMessage)(handoffTrigger);
            handoffContact = (0, human_handoff_service_1.getHandoffContact)(handoffTrigger, entities.location || context?.location);
            console.log('Human handoff triggered:', {
                reason: handoffTrigger.reason,
                priority: handoffTrigger.priority,
                expert: handoffTrigger.suggestedExpert
            });
        }
        // Log user message event with Sprint 2 enhanced metadata
        await analytics_service_1.AnalyticsService.logEvent({
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
            await conversations_service_1.ConversationsService.addMessage(conversationId, 'user', message, {
                intent,
                intentConfidence: intentResult.confidence,
                secondaryIntents: intentResult.secondaryIntents,
                entities,
                confidence,
                bias,
                biasScore: biasAnalysis.biasScore,
                ambiguous
            });
        }
        // Use enhanced response formatting
        const replyFormatted = formatResponse(reply, selected.source, bias);
        // Log bot response event with Sprint 2 metadata (only if authenticated)
        if (userId) {
            try {
                await analytics_service_1.AnalyticsService.logEvent({
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
            }
            catch (error) {
                console.warn('Failed to log analytics event:', error);
            }
        }
        // Store bot response in conversation history with Sprint 2 metadata
        if (conversation && conversationId) {
            await conversations_service_1.ConversationsService.addMessage(conversationId, 'bot', replyFormatted, {
                intent,
                confidence,
                bias,
                biasScore: biasAnalysis.biasScore,
                ambiguous,
                factCheckReliability: factCheckResult.reliability,
                hallucinationRisk: factCheckResult.hallucinationRisk,
                handoffRequired
            });
        }
        // Log handoff event if needed with enhanced metadata (only if authenticated)
        if (handoffRequired && userId) {
            try {
                await analytics_service_1.AnalyticsService.logEvent({
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
            }
            catch (error) {
                console.warn('Failed to log analytics event:', error);
            }
        }
        res.json({
            response: replyFormatted,
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
            matches: matches.map((m) => ({
                text: m.text,
                source: m.source,
                chunk_index: m.chunk_index,
                score: m.distance
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
            } : {})
        });
    }
    catch (err) {
        console.error('Chat endpoint error:', err);
        logErrorToFile(err, req);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ response: 'I apologize, but something went wrong on my end. Please try again, and if the problem persists, you may want to contact support directly.' });
    }
});
router.post('/search', async (req, res) => {
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
        const embedding = Array.from(embeddingTensor.data);
        // Query ChromaDB for top 5 most similar chunks
        const results = await collection.query({
            queryEmbeddings: [embedding],
            nResults: 5
        });
        // Format results
        const matches = (results.documents[0] || []).map((text, i) => ({
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
    }
    catch (err) {
        logErrorToFile(err, req);
        const errorMessage = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: 'Search failed', details: err instanceof Error ? err.message : String(err) });
    }
});
// Admin endpoint to fetch last 100 bias/fairness log entries
router.get('/bias-logs', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.VIEW_SYSTEM_LOGS), async (req, res) => {
    try {
        if (!fs_1.default.existsSync(biasLogPath)) {
            return res.json({ logs: [] });
        }
        const data = fs_1.default.readFileSync(biasLogPath, 'utf-8');
        const entries = data.split('\n[').filter(Boolean).map(e => '[' + e).slice(-100);
        res.json({ logs: entries });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to read bias/fairness logs.' });
    }
});
// Admin endpoint: analytics summary
router.get('/admin/analytics', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.READ_ADVANCED_ANALYTICS), async (req, res) => {
    try {
        const summary = await analytics_service_1.AnalyticsService.getOverallSummary();
        res.json({ summary });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// Admin endpoint: user list
router.get('/admin/users', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.ADMIN_API_ACCESS), async (req, res) => {
    try {
        const { data: users, error } = await database_1.supabase
            .from('users')
            .select('id, name, email, county, language, role, is_active, created_at')
            .order('created_at', { ascending: false });
        if (error) {
            return res.status(500).json({ error: 'Failed to fetch users' });
        }
        res.json({ users: users || [] });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// Document management endpoints
router.get('/admin/documents', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.MANAGE_CONTENT), async (req, res) => {
    try {
        const workspaceRoot = path_1.default.resolve(__dirname, '../../../');
        const laCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/LA County");
        const pasadenaCountyDir = path_1.default.join(workspaceRoot, "chatbot/frontend/public/Pasadena County");
        const laCountyPDFs = (0, document_ingest_1.findAllPDFs)(laCountyDir).map((pdf) => ({
            path: pdf,
            name: path_1.default.basename(pdf),
            county: 'LA County',
            indexed: true // Assume indexed for now
        }));
        const pasadenaCountyPDFs = (0, document_ingest_1.findAllPDFs)(pasadenaCountyDir).map((pdf) => ({
            path: pdf,
            name: path_1.default.basename(pdf),
            county: 'Pasadena County',
            indexed: true // Assume indexed for now
        }));
        res.json({ documents: [...laCountyPDFs, ...pasadenaCountyPDFs] });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});
router.post('/admin/documents/reindex', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.MANAGE_CONTENT), async (req, res) => {
    try {
        const result = await (0, document_ingest_1.reindexAllDocuments)();
        res.json({ message: 'Document reindexing completed', result });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to trigger reindexing', details: err instanceof Error ? err.message : String(err) });
    }
});
router.post('/admin/documents/upload', (0, authorize_middleware_1.requirePermission)(auth_types_1.Permission.MANAGE_CONTENT), async (req, res) => {
    try {
        // Handle file upload (placeholder for now)
        res.json({ message: 'File upload endpoint - implementation pending' });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
exports.default = router;
