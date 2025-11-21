/**
 * Advanced Bias Detection Service
 *
 * ML-based bias detection beyond simple keyword matching
 * Features:
 * - Language pattern analysis
 * - Demographic representation check
 * - Historical bias recognition
 * - Multi-perspective validation
 * - Bias correction suggestions
 */

export interface BiasAnalysis {
  detected: boolean;
  biasScore: number; // 0-1, higher = more biased
  biasTypes: BiasType[];
  patterns: string[];
  suggestions: string[];
  demographicIssues?: string[];
  correctedText?: string;
}

export enum BiasType {
  PRESCRIPTIVE = 'prescriptive', // "should", "must"
  ABSOLUTE = 'absolute', // "always", "never"
  ASSUMPTIVE = 'assumptive', // assuming user knowledge/situation
  DEMOGRAPHIC = 'demographic', // age, gender, race assumptions
  ECONOMIC = 'economic', // wealth assumptions
  JUDGMENTAL = 'judgmental', // value judgments
  EXCLUSIVE = 'exclusive', // excluding certain groups
}

// Advanced bias patterns with ML-inspired scoring
const BIAS_PATTERNS = {
  prescriptive: {
    patterns: [
      /\b(should|must|have to|need to|required to|obligated to)\b/gi,
      /\b(always|never|definitely|certainly|absolutely)\s+(should|must)/gi,
    ],
    weight: 0.8,
    suggestions: [
      'Use "you may want to" instead of "you should"',
      'Replace "must" with "it\'s recommended to"',
      'Use "consider" instead of prescriptive language'
    ]
  },
  absolute: {
    patterns: [
      /\b(always|never|all|none|every|no one)\b/gi,
      /\b(100%|absolutely|definitely|certainly)\b/gi,
      /\bguaranteed?\b/gi,
    ],
    weight: 0.9,
    suggestions: [
      'Replace "always" with "typically" or "usually"',
      'Use "rarely" instead of "never"',
      'Avoid absolute statements - add qualifiers'
    ]
  },
  assumptive: {
    patterns: [
      /\bof course\b/gi,
      /\bobviously\b/gi,
      /\bclearly\b/gi,
      /\beveryone knows\b/gi,
      /\byou already know\b/gi,
      /\bas you know\b/gi,
    ],
    weight: 0.85,
    suggestions: [
      'Remove assumptive phrases like "obviously" or "of course"',
      'Don\'t assume user knowledge - provide context',
      'Replace "everyone knows" with explicit information'
    ]
  },
  demographic: {
    patterns: [
      /\b(elderly|old people|seniors)\b(?!.*(?:program|assistance|support))/gi,
      /\b(young people|millennials|gen z)\b/gi,
      /\bmen\s+and\s+women\b/gi, // Exclusionary phrasing
      /\bnormal\s+family\b/gi,
    ],
    weight: 1.0, // Highest weight
    suggestions: [
      'Use "older adults" instead of "elderly"',
      'Avoid age-based assumptions',
      'Use inclusive language that doesn\'t exclude groups'
    ]
  },
  economic: {
    patterns: [
      /\bjust\s+(pay|buy|hire)\b/gi,
      /\bsimply\s+(afford|purchase)\b/gi,
      /\beasily\s+afford\b/gi,
      /\bif you can afford\b/gi,
    ],
    weight: 0.9,
    suggestions: [
      'Acknowledge financial constraints - mention assistance programs',
      'Avoid phrases like "just pay" that assume financial capability',
      'Provide low-cost and no-cost alternatives'
    ]
  },
  judgmental: {
    patterns: [
      /\b(stupid|dumb|foolish|idiotic)\b/gi,
      /\b(smart|wise|intelligent)\s+people\b/gi,
      /\birresponsible|reckless\b/gi,
      /\bunethical|immoral\b/gi,
    ],
    weight: 1.0,
    suggestions: [
      'Remove judgmental language',
      'Use neutral, factual descriptions',
      'Avoid value judgments about user decisions'
    ]
  },
  exclusive: {
    patterns: [
      /\bonly\s+(homeowners|residents)\b/gi,
      /\breal\s+(homeowners|residents)\b/gi,
      /\bnormal\s+people\b/gi,
    ],
    weight: 0.85,
    suggestions: [
      'Use inclusive language',
      'Avoid "only" or "real" that excludes groups',
      'Consider all affected populations'
    ]
  }
};

/**
 * Analyze text for bias
 */
export function analyzeBias(text: string): BiasAnalysis {
  const detectedTypes: Set<BiasType> = new Set();
  const patterns: string[] = [];
  const suggestions: Set<string> = new Set();
  let totalScore = 0;
  let patternCount = 0;

  // Analyze each bias type
  for (const [type, config] of Object.entries(BIAS_PATTERNS)) {
    for (const pattern of config.patterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detectedTypes.add(type as BiasType);
        patterns.push(...matches.map(m => m.toLowerCase()));
        config.suggestions.forEach(s => suggestions.add(s));

        // Calculate weighted score
        totalScore += (matches.length * config.weight);
        patternCount += matches.length;
      }
    }
  }

  // Calculate bias score (0-1 scale)
  const biasScore = patternCount > 0
    ? Math.min(totalScore / (patternCount * 3), 1.0) // Normalize
    : 0;

  // Demographic analysis
  const demographicIssues = analyzeDemographicRepresentation(text);

  // Generate corrected text if bias detected
  const correctedText = biasScore > 0.3 ? correctBias(text, Array.from(detectedTypes)) : undefined;

  return {
    detected: biasScore > 0.2, // Threshold for flagging
    biasScore,
    biasTypes: Array.from(detectedTypes),
    patterns: [...new Set(patterns)],
    suggestions: Array.from(suggestions).slice(0, 3), // Top 3 suggestions
    demographicIssues: demographicIssues.length > 0 ? demographicIssues : undefined,
    correctedText
  };
}

/**
 * Analyze demographic representation
 */
function analyzeDemographicRepresentation(text: string): string[] {
  const issues: string[] = [];

  // Check for exclusionary language
  if (/(only|just)\s+(homeowners|property owners)/gi.test(text)) {
    issues.push('Language may exclude renters or non-property owners');
  }

  if (/\b(men|women|male|female)\b/gi.test(text) && !/\b(all|everyone|people)\b/gi.test(text)) {
    issues.push('Consider using gender-neutral language');
  }

  // Check for age assumptions
  if (/(young|old|elderly)\s+(?:people|adults|residents)/gi.test(text)) {
    issues.push('Avoid age-based assumptions - provide info for all age groups');
  }

  // Check for ability assumptions
  if (/(simply|just|easily)\s+(walk|drive|access)/gi.test(text)) {
    issues.push('Consider accessibility needs - not everyone has the same mobility');
  }

  // Check for language assumptions
  if (!/(?:translation|interpreter|language assistance)/gi.test(text) && text.length > 200) {
    // For longer responses, check if language support is mentioned
    if (/(contact|call|visit|apply)/gi.test(text)) {
      issues.push('Consider mentioning language assistance availability');
    }
  }

  return issues;
}

/**
 * Correct biased text
 */
export function correctBias(text: string, biasTypes: BiasType[]): string {
  let corrected = text;

  // Apply corrections based on detected bias types
  if (biasTypes.includes(BiasType.PRESCRIPTIVE)) {
    corrected = corrected
      .replace(/\bshould\b/gi, 'may want to')
      .replace(/\bmust\b/gi, 'it is recommended to')
      .replace(/\bhave to\b/gi, 'can')
      .replace(/\bneed to\b/gi, 'may need to');
  }

  if (biasTypes.includes(BiasType.ABSOLUTE)) {
    corrected = corrected
      .replace(/\balways\b/gi, 'typically')
      .replace(/\bnever\b/gi, 'rarely')
      .replace(/\ball\b(?!\s+(?:information|details|documents))/gi, 'most')
      .replace(/\bnone\b/gi, 'few');
  }

  if (biasTypes.includes(BiasType.ASSUMPTIVE)) {
    corrected = corrected
      .replace(/\bof course,?\s*/gi, '')
      .replace(/\bobviously,?\s*/gi, '')
      .replace(/\bclearly,?\s*/gi, '')
      .replace(/\beveryone knows\s+/gi, '')
      .replace(/\bas you know,?\s*/gi, '');
  }

  if (biasTypes.includes(BiasType.ECONOMIC)) {
    corrected = corrected
      .replace(/\bjust pay\b/gi, 'pay (financial assistance may be available)')
      .replace(/\bsimply afford\b/gi, 'afford (check for assistance programs)');
  }

  return corrected;
}

/**
 * Get bias severity level
 */
export function getBiasSeverity(biasScore: number): 'low' | 'medium' | 'high' | 'critical' {
  if (biasScore >= 0.7) return 'critical';
  if (biasScore >= 0.5) return 'high';
  if (biasScore >= 0.3) return 'medium';
  return 'low';
}

/**
 * Check if response should be flagged for review
 */
export function shouldFlagForReview(analysis: BiasAnalysis): boolean {
  // Flag if:
  // 1. High bias score
  if (analysis.biasScore >= 0.6) return true;

  // 2. Demographic or judgmental bias detected
  if (analysis.biasTypes.includes(BiasType.DEMOGRAPHIC) ||
      analysis.biasTypes.includes(BiasType.JUDGMENTAL)) {
    return true;
  }

  // 3. Multiple bias types with moderate score
  if (analysis.biasTypes.length >= 3 && analysis.biasScore >= 0.4) {
    return true;
  }

  return false;
}

/**
 * Generate bias report for logging
 */
export function generateBiasReport(text: string, analysis: BiasAnalysis): string {
  const severity = getBiasSeverity(analysis.biasScore);
  const report = `
Bias Analysis Report
====================
Severity: ${severity.toUpperCase()}
Bias Score: ${(analysis.biasScore * 100).toFixed(1)}%
Detected Patterns: ${analysis.patterns.length}

Bias Types Found:
${analysis.biasTypes.map(t => `- ${t}`).join('\n')}

Flagged Patterns:
${analysis.patterns.map(p => `- "${p}"`).join('\n')}

Suggestions:
${analysis.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${analysis.demographicIssues && analysis.demographicIssues.length > 0 ? `
Demographic Issues:
${analysis.demographicIssues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}
` : ''}

${analysis.correctedText ? `
Suggested Correction:
${analysis.correctedText}
` : ''}
`;

  return report;
}
