/**
 * Hallucination Testing Framework (Sprint 4)
 *
 * Tests for cross-reference verification, source reliability validation,
 * and conflict detection to prevent AI hallucinations.
 */

import { factCheck } from '../services/fact-checking.service';

export interface HallucinationTestCase {
  id: string;
  name: string;
  input: string;
  context?: {
    location?: string;
    topic?: string;
    intent?: string;
  };
  expectedVerified: boolean;
  expectedReliability: 'high' | 'medium' | 'low' | 'unverified';
  expectedHallucinationRisk: 'low' | 'medium' | 'high'; // <0.3, 0.3-0.6, >0.6
  expectedConflicts?: boolean;
  category: 'factual' | 'procedural' | 'temporal' | 'quantitative' | 'speculative';
}

export interface HallucinationTestResult {
  testId: string;
  testName: string;
  passed: boolean;
  actualVerified: boolean;
  expectedVerified: boolean;
  actualReliability: string;
  expectedReliability: string;
  actualHallucinationRisk: number;
  expectedHallucinationRisk: string;
  actualConflicts: number;
  message: string;
}

export interface HallucinationTestSuiteReport {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  results: HallucinationTestResult[];
  summary: {
    byCategory: { [category: string]: { passed: number; failed: number } };
    byReliability: { [reliability: string]: number };
    averageHallucinationRisk: number;
    highRiskCount: number;
  };
}

/**
 * Comprehensive hallucination test cases
 */
export const HALLUCINATION_TEST_CASES: HallucinationTestCase[] = [
  // Factual Information (should be verifiable)
  {
    id: 'factual-1',
    name: 'Should verify factual information about FEMA',
    input: 'FEMA provides individual assistance to homeowners affected by declared disasters.',
    context: { topic: 'financial-assistance', intent: 'information' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'factual'
  },
  {
    id: 'factual-2',
    name: 'Should verify LA County information',
    input: 'LA County offers debris removal services to fire-affected properties.',
    context: { location: 'LA County', topic: 'debris-removal' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'factual'
  },
  {
    id: 'factual-3',
    name: 'Should detect unverifiable claim',
    input: 'All fire survivors receive automatic compensation of $50,000 from the state.',
    context: { topic: 'financial-assistance' },
    expectedVerified: false,
    expectedReliability: 'unverified',
    expectedHallucinationRisk: 'high',
    category: 'factual'
  },

  // Procedural Information
  {
    id: 'procedural-1',
    name: 'Should verify debris removal procedure',
    input: 'Homeowners must complete an opt-out form to arrange private debris removal.',
    context: { topic: 'debris-removal', intent: 'process' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'procedural'
  },
  {
    id: 'procedural-2',
    name: 'Should detect fabricated procedure',
    input: 'You must submit debris removal applications in person at the county office within 24 hours.',
    context: { topic: 'debris-removal' },
    expectedVerified: false,
    expectedReliability: 'low',
    expectedHallucinationRisk: 'high',
    category: 'procedural'
  },

  // Temporal Information (dates, deadlines)
  {
    id: 'temporal-1',
    name: 'Should flag specific dates without verification',
    input: 'The debris removal opt-out deadline is April 30, 2025.',
    context: { location: 'Pasadena', topic: 'debris-removal' },
    expectedVerified: true,
    expectedReliability: 'medium',
    expectedHallucinationRisk: 'medium',
    expectedConflicts: false,
    category: 'temporal'
  },
  {
    id: 'temporal-2',
    name: 'Should detect fabricated deadline',
    input: 'All insurance claims must be filed within 48 hours of the fire.',
    context: { topic: 'insurance' },
    expectedVerified: false,
    expectedReliability: 'unverified',
    expectedHallucinationRisk: 'high',
    category: 'temporal'
  },

  // Quantitative Information (numbers, amounts)
  {
    id: 'quantitative-1',
    name: 'Should verify verifiable amounts',
    input: 'FEMA provides up to $37,900 in individual assistance for disaster-related expenses.',
    context: { topic: 'financial-assistance' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'quantitative'
  },
  {
    id: 'quantitative-2',
    name: 'Should detect fabricated amounts',
    input: 'The county will pay homeowners $10,000 for every room destroyed in the fire.',
    context: { topic: 'financial-assistance' },
    expectedVerified: false,
    expectedReliability: 'unverified',
    expectedHallucinationRisk: 'high',
    category: 'quantitative'
  },

  // Speculative Information (should be flagged as unverifiable)
  {
    id: 'speculative-1',
    name: 'Should flag speculative predictions',
    input: 'Insurance companies will likely deny your claim on the first attempt.',
    context: { topic: 'insurance' },
    expectedVerified: false,
    expectedReliability: 'low',
    expectedHallucinationRisk: 'high',
    category: 'speculative'
  },
  {
    id: 'speculative-2',
    name: 'Should flag opinion as unverifiable',
    input: 'The best option is to hire a private contractor for debris removal.',
    context: { topic: 'debris-removal' },
    expectedVerified: false,
    expectedReliability: 'low',
    expectedHallucinationRisk: 'medium',
    category: 'speculative'
  },

  // Control Cases (verified, accurate information)
  {
    id: 'control-1',
    name: 'Should verify general Red Cross information',
    input: 'The American Red Cross provides emergency assistance to disaster survivors.',
    context: { topic: 'emotional_support' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'factual'
  },
  {
    id: 'control-2',
    name: 'Should verify building permit requirement',
    input: 'Building permits are required for reconstruction after fire damage.',
    context: { topic: 'permits', intent: 'information' },
    expectedVerified: true,
    expectedReliability: 'high',
    expectedHallucinationRisk: 'low',
    category: 'procedural'
  }
];

/**
 * Run the hallucination testing suite
 */
export async function runHallucinationTestSuite(
  testCases: HallucinationTestCase[] = HALLUCINATION_TEST_CASES
): Promise<HallucinationTestSuiteReport> {
  const results: HallucinationTestResult[] = [];
  const byCategory: { [category: string]: { passed: number; failed: number } } = {};
  const byReliability: { [reliability: string]: number } = {};
  let totalHallucinationRisk = 0;

  for (const testCase of testCases) {
    const result = await runHallucinationTest(testCase);
    results.push(result);

    // Track by category
    if (!byCategory[testCase.category]) {
      byCategory[testCase.category] = { passed: 0, failed: 0 };
    }
    if (result.passed) {
      byCategory[testCase.category].passed++;
    } else {
      byCategory[testCase.category].failed++;
    }

    // Track by reliability
    byReliability[result.actualReliability] = (byReliability[result.actualReliability] || 0) + 1;

    totalHallucinationRisk += result.actualHallucinationRisk;
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = (passed / results.length) * 100;
  const averageHallucinationRisk = totalHallucinationRisk / results.length;
  const highRiskCount = results.filter(r => r.actualHallucinationRisk > 0.6).length;

  return {
    totalTests: results.length,
    passed,
    failed,
    passRate: Math.round(passRate * 10) / 10,
    results,
    summary: {
      byCategory,
      byReliability,
      averageHallucinationRisk: Math.round(averageHallucinationRisk * 100) / 100,
      highRiskCount
    }
  };
}

/**
 * Run a single hallucination test
 */
export async function runHallucinationTest(testCase: HallucinationTestCase): Promise<HallucinationTestResult> {
  const factCheckResult = await factCheck(testCase.input, testCase.context);

  let passed = true;
  let message = 'Test passed';

  // Check if verification status matches
  if (factCheckResult.verified !== testCase.expectedVerified) {
    passed = false;
    message = `Expected verified: ${testCase.expectedVerified}, got: ${factCheckResult.verified}`;
  }

  // Check if reliability matches
  if (factCheckResult.reliability !== testCase.expectedReliability) {
    // Allow one level of tolerance for reliability (medium vs high is acceptable)
    const reliabilityLevels = ['unverified', 'low', 'medium', 'high'];
    const expectedIndex = reliabilityLevels.indexOf(testCase.expectedReliability);
    const actualIndex = reliabilityLevels.indexOf(factCheckResult.reliability);

    if (Math.abs(expectedIndex - actualIndex) > 1) {
      passed = false;
      message = `Expected reliability: ${testCase.expectedReliability}, got: ${factCheckResult.reliability}`;
    }
  }

  // Check hallucination risk level
  const riskLevel = factCheckResult.hallucinationRisk < 0.3 ? 'low' :
                    factCheckResult.hallucinationRisk <= 0.6 ? 'medium' : 'high';

  if (riskLevel !== testCase.expectedHallucinationRisk) {
    passed = false;
    message = `Expected hallucination risk: ${testCase.expectedHallucinationRisk}, got: ${riskLevel} (${factCheckResult.hallucinationRisk.toFixed(2)})`;
  }

  // Check for conflicts if specified
  if (testCase.expectedConflicts !== undefined) {
    const hasConflicts = factCheckResult.conflicts.length > 0;
    if (hasConflicts !== testCase.expectedConflicts) {
      passed = false;
      message = `Expected conflicts: ${testCase.expectedConflicts}, got: ${hasConflicts}`;
    }
  }

  return {
    testId: testCase.id,
    testName: testCase.name,
    passed,
    actualVerified: factCheckResult.verified,
    expectedVerified: testCase.expectedVerified,
    actualReliability: factCheckResult.reliability,
    expectedReliability: testCase.expectedReliability,
    actualHallucinationRisk: factCheckResult.hallucinationRisk,
    expectedHallucinationRisk: testCase.expectedHallucinationRisk,
    actualConflicts: factCheckResult.conflicts.length,
    message
  };
}

/**
 * Generate hallucination testing report
 */
export function generateHallucinationTestReport(report: HallucinationTestSuiteReport): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('HALLUCINATION DETECTION TEST SUITE REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  lines.push(`Total Tests: ${report.totalTests}`);
  lines.push(`Passed: ${report.passed} (${report.passRate.toFixed(1)}%)`);
  lines.push(`Failed: ${report.failed}`);
  lines.push('');

  lines.push('Summary by Category:');
  lines.push('-'.repeat(80));
  for (const [category, stats] of Object.entries(report.summary.byCategory)) {
    const total = stats.passed + stats.failed;
    const passRate = (stats.passed / total) * 100;
    lines.push(`  ${category.padEnd(20)} | Passed: ${stats.passed}/${total} (${passRate.toFixed(1)}%)`);
  }
  lines.push('');

  lines.push('Reliability Distribution:');
  lines.push('-'.repeat(80));
  for (const [reliability, count] of Object.entries(report.summary.byReliability)) {
    const percentage = (count / report.totalTests) * 100;
    lines.push(`  ${reliability.padEnd(20)} | ${count} (${percentage.toFixed(1)}%)`);
  }
  lines.push('');

  lines.push(`Average Hallucination Risk: ${(report.summary.averageHallucinationRisk * 100).toFixed(1)}%`);
  lines.push(`High Risk Count (>60%): ${report.summary.highRiskCount}`);
  lines.push('');

  lines.push('Failed Tests:');
  lines.push('-'.repeat(80));
  const failedTests = report.results.filter(r => !r.passed);
  if (failedTests.length === 0) {
    lines.push('  None - all tests passed!');
  } else {
    for (const test of failedTests) {
      lines.push(`  [${test.testId}] ${test.testName}`);
      lines.push(`    ${test.message}`);
      lines.push(`    Actual: verified=${test.actualVerified}, reliability=${test.actualReliability}, risk=${(test.actualHallucinationRisk * 100).toFixed(1)}%`);
      lines.push(`    Expected: verified=${test.expectedVerified}, reliability=${test.expectedReliability}, risk=${test.expectedHallucinationRisk}`);
      lines.push('');
    }
  }

  lines.push('='.repeat(80));

  return lines.join('\n');
}

/**
 * Run regression tests
 */
export async function runRegressionTests(): Promise<HallucinationTestSuiteReport> {
  console.log('Running hallucination detection regression tests...');
  const report = await runHallucinationTestSuite();
  console.log(generateHallucinationTestReport(report));
  return report;
}

/**
 * Source reliability validation
 */
export interface SourceReliabilityTest {
  sourceName: string;
  expectedReliability: number; // 0-1
  category: 'government' | 'nonprofit' | 'commercial';
}

export interface SourceReliabilityReport {
  totalSources: number;
  byCategory: { [category: string]: { count: number; avgReliability: number } };
  lowReliabilitySources: Array<{ name: string; reliability: number }>;
}

export function validateSourceReliability(sources: SourceReliabilityTest[]): SourceReliabilityReport {
  const byCategory: { [category: string]: { count: number; totalReliability: number } } = {};
  const lowReliabilitySources: Array<{ name: string; reliability: number }> = [];

  for (const source of sources) {
    if (!byCategory[source.category]) {
      byCategory[source.category] = { count: 0, totalReliability: 0 };
    }

    byCategory[source.category].count++;
    byCategory[source.category].totalReliability += source.expectedReliability;

    if (source.expectedReliability < 0.7) {
      lowReliabilitySources.push({
        name: source.sourceName,
        reliability: source.expectedReliability
      });
    }
  }

  const byCategoryReport: { [category: string]: { count: number; avgReliability: number } } = {};
  for (const [category, stats] of Object.entries(byCategory)) {
    byCategoryReport[category] = {
      count: stats.count,
      avgReliability: stats.totalReliability / stats.count
    };
  }

  return {
    totalSources: sources.length,
    byCategory: byCategoryReport,
    lowReliabilitySources: lowReliabilitySources.sort((a, b) => a.reliability - b.reliability)
  };
}

/**
 * Conflict detection tests
 */
export interface ConflictDetectionTest {
  id: string;
  claim1: string;
  claim2: string;
  expectedConflict: boolean;
}

export interface ConflictDetectionReport {
  totalTests: number;
  passed: number;
  failed: number;
  falsePositives: number;
  falseNegatives: number;
}

export async function testConflictDetection(tests: ConflictDetectionTest[]): Promise<ConflictDetectionReport> {
  let passed = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const test of tests) {
    const [result1, result2] = await Promise.all([
      factCheck(test.claim1),
      factCheck(test.claim2)
    ]);

    // Simplified conflict detection (in reality, this would be more sophisticated)
    const hasConflict = result1.conflicts.length > 0 || result2.conflicts.length > 0;

    if (hasConflict === test.expectedConflict) {
      passed++;
    } else if (hasConflict && !test.expectedConflict) {
      falsePositives++;
    } else if (!hasConflict && test.expectedConflict) {
      falseNegatives++;
    }
  }

  return {
    totalTests: tests.length,
    passed,
    failed: tests.length - passed,
    falsePositives,
    falseNegatives
  };
}
