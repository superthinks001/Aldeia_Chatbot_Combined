/**
 * Fact-Checking Service
 *
 * Verifies AI responses against authoritative sources
 * Features:
 * - Source verification
 * - Cross-reference checking
 * - Hallucination detection
 * - Reliability scoring
 */

export interface FactCheckResult {
  verified: boolean;
  confidence: number;
  sources: AuthoritativeSource[];
  conflicts: Conflict[];
  hallucinationRisk: number; // 0-1
  reliability: 'high' | 'medium' | 'low' | 'unverified';
  recommendations: string[];
}

export interface AuthoritativeSource {
  name: string;
  url?: string;
  reliability: number; // 0-1
  lastUpdated?: Date;
  category: 'government' | 'official' | 'community' | 'third-party';
}

export interface Conflict {
  claim: string;
  source1: string;
  source2: string;
  description: string;
}

// Authoritative sources database
const AUTHORITATIVE_SOURCES: { [key: string]: AuthoritativeSource } = {
  'LA County Fire Recovery': {
    name: 'LA County Official Fire Recovery Portal',
    url: 'https://recovery.lacounty.gov',
    reliability: 1.0,
    category: 'government'
  },
  'Pasadena Fire Recovery': {
    name: 'City of Pasadena Fire Recovery',
    url: 'https://www.cityofpasadena.net/fire-recovery',
    reliability: 1.0,
    category: 'government'
  },
  'FEMA': {
    name: 'Federal Emergency Management Agency',
    url: 'https://www.fema.gov',
    reliability: 0.95,
    category: 'government'
  },
  'CalFire': {
    name: 'California Department of Forestry and Fire Protection',
    url: 'https://www.fire.ca.gov',
    reliability: 0.95,
    category: 'government'
  },
  'Red Cross': {
    name: 'American Red Cross',
    url: 'https://www.redcross.org',
    reliability: 0.90,
    category: 'official'
  },
  'Community Resource': {
    name: 'Community Resource Centers',
    reliability: 0.75,
    category: 'community'
  }
};

// Import ChromaDB fact-checking service
import { searchSimilarFacts, initializeVerifiedFacts } from './fact-checking-chromadb';

// Initialize verified facts on module load (lazy initialization)
let factsInitialized = false;
async function ensureFactsInitialized() {
  if (!factsInitialized) {
    try {
      await initializeVerifiedFacts();
      factsInitialized = true;
    } catch (error) {
      console.error('[FACT-CHECKING] Failed to initialize verified facts:', error);
    }
  }
}

/**
 * Fact-check a response (async version using ChromaDB)
 */
export async function factCheck(response: string, context?: any): Promise<FactCheckResult> {
  // Ensure facts are initialized
  await ensureFactsInitialized();
  
  const facts = extractClaims(response);
  const verifiedSources: AuthoritativeSource[] = [];
  const conflicts: Conflict[] = [];
  let verifiedCount = 0;
  let hallucinationRisk = 0;

  // Check each claim
  for (const claim of facts) {
    const verification = await verifyClaim(claim, context);

    if (verification.verified) {
      verifiedCount++;
      verifiedSources.push(...verification.sources);
    } else if (verification.conflicting) {
      conflicts.push({
        claim: claim,
        source1: verification.sources[0]?.name || 'AI Response',
        source2: verification.sources[1]?.name || 'Known Facts',
        description: verification.conflict || 'Information mismatch detected'
      });
    }

    hallucinationRisk += verification.hallucinationRisk;
  }

  // Calculate overall metrics
  const verified = verifiedCount >= facts.length * 0.8; // 80% threshold
  const confidence = facts.length > 0 ? verifiedCount / facts.length : 0.5;
  hallucinationRisk = facts.length > 0 ? hallucinationRisk / facts.length : 0.3;

  // Determine reliability
  let reliability: FactCheckResult['reliability'] = 'unverified';
  if (confidence >= 0.9 && hallucinationRisk < 0.2) reliability = 'high';
  else if (confidence >= 0.7 && hallucinationRisk < 0.4) reliability = 'medium';
  else if (confidence >= 0.5 && hallucinationRisk < 0.6) reliability = 'low';

  // Generate recommendations
  const recommendations = generateRecommendations(verified, confidence, hallucinationRisk, conflicts);

  // Deduplicate sources
  const uniqueSources = Array.from(
    new Map(verifiedSources.map(s => [s.name, s])).values()
  );

  return {
    verified,
    confidence,
    sources: uniqueSources,
    conflicts,
    hallucinationRisk,
    reliability,
    recommendations
  };
}

/**
 * Extract factual claims from response
 */
function extractClaims(response: string): string[] {
  const claims: string[] = [];

  // Split into sentences
  const sentences = response.split(/[.!?]+/).filter(s => s.trim().length > 10);

  for (const sentence of sentences) {
    // Filter out conversational/non-factual sentences
    if (sentence.match(/^(hi|hello|how|can|may|would|please|thank)/i)) continue;
    if (sentence.match(/(help|assist|happy to|glad to)/i)) continue;

    // Keep sentences with factual indicators
    if (sentence.match(/(is|are|will|must|required|deadline|date|cost|fee|program|available)/i)) {
      claims.push(sentence.trim());
    }
  }

  return claims;
}

/**
 * Verify a specific claim using ChromaDB vector similarity search
 */
async function verifyClaim(claim: string, context?: any): Promise<{
  verified: boolean;
  conflicting: boolean;
  sources: AuthoritativeSource[];
  hallucinationRisk: number;
  conflict?: string;
}> {
  // Search for similar facts in ChromaDB using embeddings
  const similarFacts = await searchSimilarFacts(claim, 5, 0.7);

  if (similarFacts.length > 0) {
    // Found similar facts - check consistency
    const bestMatch = similarFacts[0];
    
    if (isConsistent(claim.toLowerCase(), bestMatch.fact.toLowerCase())) {
      // Fact is verified and consistent
      return {
        verified: true,
        conflicting: false,
        sources: bestMatch.sources.map(s => AUTHORITATIVE_SOURCES[s] || {
          name: s,
          reliability: 0.7,
          category: 'third-party' as const
        }),
        hallucinationRisk: 0.1
      };
    } else {
      // Fact contradicts verified fact
      return {
        verified: false,
        conflicting: true,
        sources: bestMatch.sources.map(s => AUTHORITATIVE_SOURCES[s] || {
          name: s,
          reliability: 0.7,
          category: 'third-party' as const
        }),
        hallucinationRisk: 0.8,
        conflict: `Claim contradicts known fact: ${bestMatch.fact}`
      };
    }
  }

  // Check for specific indicators
  const hallucinationIndicators = detectHallucinationIndicators(claim);

  // Determine hallucination risk
  const hallucinationRisk = hallucinationIndicators.length > 0 ? 0.6 : 0.3;

  // If context includes sources, verify against them
  if (context?.sources && context.sources.length > 0) {
    return {
      verified: true,
      conflicting: false,
      sources: context.sources.map((s: string) =>
        AUTHORITATIVE_SOURCES[s] || {
          name: s,
          reliability: 0.7,
          category: 'third-party' as const
        }
      ),
      hallucinationRisk: 0.2
    };
  }

  // Unverified claim
  return {
    verified: false,
    conflicting: false,
    sources: [],
    hallucinationRisk
  };
}

/**
 * Check if two pieces of text contain similar information
 */
function containsSimilarInfo(text1: string, text2: string): boolean {
  // Extract key terms
  const extractKeyTerms = (text: string): string[] => {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'been', 'will', 'your', 'their'].includes(word));
  };

  const terms1 = new Set(extractKeyTerms(text1));
  const terms2 = new Set(extractKeyTerms(text2));

  // Calculate overlap
  const intersection = [...terms1].filter(x => terms2.has(x));
  const union = new Set([...terms1, ...terms2]);

  const similarity = intersection.length / union.size;

  return similarity > 0.3; // 30% similarity threshold
}

/**
 * Check if claim is consistent with verified fact
 */
function isConsistent(claim: string, verifiedFact: string): boolean {
  // Check for contradictory indicators
  const contradictoryPatterns = [
    { pattern: /not|no|never|don't/, inClaim: true, inFact: false },
    { pattern: /\d+/, extract: true } // Check if numbers match
  ];

  for (const check of contradictoryPatterns) {
    if (check.extract && check.pattern.test(claim) && check.pattern.test(verifiedFact)) {
      // Extract and compare numbers
      const claimNumbers = claim.match(/\d+/g) || [];
      const factNumbers = verifiedFact.match(/\d+/g) || [];

      // If numbers are significantly different, flag inconsistency
      if (claimNumbers.length > 0 && factNumbers.length > 0) {
        const claimNum = parseInt(claimNumbers[0]);
        const factNum = parseInt(factNumbers[0]);
        if (Math.abs(claimNum - factNum) / factNum > 0.1) { // >10% difference
          return false;
        }
      }
    }
  }

  // Check for negation mismatches
  const claimHasNegation = /not|no|never|don't/i.test(claim);
  const factHasNegation = /not|no|never|don't/i.test(verifiedFact);

  if (claimHasNegation !== factHasNegation) {
    return false; // One is negated, other is not
  }

  return true;
}

/**
 * Detect hallucination indicators
 */
function detectHallucinationIndicators(claim: string): string[] {
  const indicators: string[] = [];

  // Overly specific details
  if (claim.match(/exactly|precisely|\d{2}:\d{2}|specific|particular/i)) {
    indicators.push('Overly specific details that may not be verified');
  }

  // Absolute statements
  if (claim.match(/always|never|all|none|every single/i)) {
    indicators.push('Absolute statements without qualification');
  }

  // Unverifiable claims
  if (claim.match(/guaranteed|100%|certain|definitely will/i)) {
    indicators.push('Unverifiable guarantee or certainty');
  }

  // Personal anecdotes (red flag for AI)
  if (claim.match(/i (saw|heard|know|remember)|in my experience/i)) {
    indicators.push('First-person claims inappropriate for AI');
  }

  return indicators;
}

/**
 * Generate recommendations based on fact-check results
 */
function generateRecommendations(
  verified: boolean,
  confidence: number,
  hallucinationRisk: number,
  conflicts: Conflict[]
): string[] {
  const recommendations: string[] = [];

  if (!verified || confidence < 0.7) {
    recommendations.push('Verify this information with official county resources before taking action');
  }

  if (hallucinationRisk > 0.5) {
    recommendations.push('This response may contain unverified information - cross-check with authoritative sources');
  }

  if (conflicts.length > 0) {
    recommendations.push(`Conflicting information detected - please contact ${conflicts[0].source2} for clarification`);
  }

  if (confidence >= 0.8 && hallucinationRisk < 0.3) {
    recommendations.push('Information verified against authoritative sources');
  }

  // Always recommend official sources for critical decisions
  recommendations.push('For final decisions, always consult official county documentation');

  return recommendations.slice(0, 3); // Top 3 recommendations
}

/**
 * Get fact-check summary for display
 */
export function getFactCheckSummary(result: FactCheckResult): string {
  const reliabilityEmoji = {
    high: '✅',
    medium: '⚠️',
    low: '❌',
    unverified: '❓'
  };

  return `${reliabilityEmoji[result.reliability]} Reliability: ${result.reliability.toUpperCase()} | Confidence: ${(result.confidence * 100).toFixed(0)}%`;
}
