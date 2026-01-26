/**
 * Comprehensive Test Runner
 * Executes all tests listed in COMPREHENSIVE_TEST_CASES.md
 */

import { runHallucinationTestSuite } from './hallucination-testing.suite';
import { factCheck } from '../services/fact-checking.service';
import { AnalyticsService } from '../services/analytics.service';
import { initializeVerifiedFacts } from '../services/fact-checking-chromadb';

interface TestResult {
  category: string;
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'NOT_IMPLEMENTED';
  message?: string;
  duration?: number;
}

class TestRunner {
  private results: TestResult[] = [];

  async runAllTests() {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE TEST SUITE - ALDEIA CHATBOT');
    console.log('='.repeat(80));
    console.log('');

    // Run existing tests
    await this.runHallucinationTests();
    await this.runAnalyticsServiceTests();
    await this.runFactCheckingTests();
    await this.runPerformanceTests();
    await this.runSessionTrackingTests();
    await this.runDemographicTests();

    // Generate report
    this.generateReport();
  }

  private async runHallucinationTests() {
    console.log('Running Hallucination Detection Tests...');
    try {
      const report = await runHallucinationTestSuite();
      this.results.push({
        category: 'Hallucination Detection',
        testName: 'Hallucination Test Suite',
        status: report.passRate >= 80 ? 'PASS' : 'FAIL',
        message: `${report.passed}/${report.totalTests} tests passed (${report.passRate.toFixed(1)}%)`,
      });
    } catch (error: any) {
      this.results.push({
        category: 'Hallucination Detection',
        testName: 'Hallucination Test Suite',
        status: 'FAIL',
        message: error.message,
      });
    }
  }

  private async runAnalyticsServiceTests() {
    console.log('Running Analytics Service Tests...');
    
    // Test 1: logEvent
    try {
      const result = await AnalyticsService.logEvent({
        user_id: 1,
        event_type: 'test_event',
        message: 'Test message',
      });
      this.results.push({
        category: 'Analytics Service',
        testName: 'logEvent - Basic logging',
        status: result ? 'PASS' : 'FAIL',
        message: result ? 'Event logged successfully' : 'Failed to log event',
      });
    } catch (error: any) {
      this.results.push({
        category: 'Analytics Service',
        testName: 'logEvent - Basic logging',
        status: 'FAIL',
        message: error.message,
      });
    }

    // Test 2: getOverallSummary
    try {
      const summary = await AnalyticsService.getOverallSummary();
      this.results.push({
        category: 'Analytics Service',
        testName: 'getOverallSummary',
        status: summary ? 'PASS' : 'FAIL',
        message: summary ? `Found ${summary.totalEvents} events` : 'Failed to get summary',
      });
    } catch (error: any) {
      this.results.push({
        category: 'Analytics Service',
        testName: 'getOverallSummary',
        status: 'FAIL',
        message: error.message,
      });
    }
  }

  private async runFactCheckingTests() {
    console.log('Running Fact-Checking Tests...');
    
    // Test: Fact-checking service
    try {
      const result = await factCheck('FEMA provides individual assistance to homeowners affected by declared disasters.', {
        topic: 'financial-assistance',
        intent: 'information',
      });
      this.results.push({
        category: 'Fact-Checking',
        testName: 'factCheck - Basic fact verification',
        status: 'PASS',
        message: `Verified: ${result.verified}, Reliability: ${result.reliability}`,
      });
    } catch (error: any) {
      this.results.push({
        category: 'Fact-Checking',
        testName: 'factCheck - Basic fact verification',
        status: 'FAIL',
        message: error.message,
      });
    }

    // Test: ChromaDB fact initialization
    try {
      await initializeVerifiedFacts();
      this.results.push({
        category: 'ChromaDB Fact Initialization',
        testName: 'initializeVerifiedFacts',
        status: 'PASS',
        message: 'Facts initialized successfully',
      });
    } catch (error: any) {
      this.results.push({
        category: 'ChromaDB Fact Initialization',
        testName: 'initializeVerifiedFacts',
        status: 'FAIL',
        message: error.message,
      });
    }
  }

  private async runPerformanceTests() {
    console.log('Running Performance Tests...');
    
    // Test: System metrics collection (not implemented yet)
    this.results.push({
      category: 'Performance Monitoring',
      testName: 'CPU Usage Collection',
      status: 'NOT_IMPLEMENTED',
      message: 'System metrics collection not yet implemented',
    });

    this.results.push({
      category: 'Performance Monitoring',
      testName: 'Memory Usage Collection',
      status: 'NOT_IMPLEMENTED',
      message: 'System metrics collection not yet implemented',
    });

    this.results.push({
      category: 'Performance Monitoring',
      testName: 'Storage Usage Collection',
      status: 'NOT_IMPLEMENTED',
      message: 'System metrics collection not yet implemented',
    });
  }

  private async runSessionTrackingTests() {
    console.log('Running Session Tracking Tests...');
    
    // Test: Session tracking (not fully implemented in chat routes)
    this.results.push({
      category: 'Session Tracking',
      testName: 'Session Start Tracking in Chat Routes',
      status: 'NOT_IMPLEMENTED',
      message: 'Session tracking not yet integrated in chat.ts routes',
    });

    this.results.push({
      category: 'Session Tracking',
      testName: 'Device Type Detection',
      status: 'NOT_IMPLEMENTED',
      message: 'Device type detection not yet implemented',
    });

    this.results.push({
      category: 'Session Tracking',
      testName: 'Session End Tracking',
      status: 'NOT_IMPLEMENTED',
      message: 'Session end tracking not yet implemented',
    });
  }

  private async runDemographicTests() {
    console.log('Running Demographic Collection Tests...');
    
    // Test: Demographic collection (not implemented in registration)
    this.results.push({
      category: 'Demographic Collection',
      testName: 'Registration with Demographics',
      status: 'NOT_IMPLEMENTED',
      message: 'Demographic fields not yet added to registration endpoint',
    });

    this.results.push({
      category: 'Demographic Collection',
      testName: 'Demographic Survey Endpoint',
      status: 'NOT_IMPLEMENTED',
      message: 'Demographic survey endpoint not yet created',
    });
  }

  private generateReport() {
    console.log('');
    console.log('='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));
    console.log('');

    const byCategory: { [key: string]: { pass: number; fail: number; skip: number; notImplemented: number } } = {};

    this.results.forEach(result => {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { pass: 0, fail: 0, skip: 0, notImplemented: 0 };
      }
      if (result.status === 'PASS') byCategory[result.category].pass++;
      else if (result.status === 'FAIL') byCategory[result.category].fail++;
      else if (result.status === 'SKIP') byCategory[result.category].skip++;
      else if (result.status === 'NOT_IMPLEMENTED') byCategory[result.category].notImplemented++;
    });

    // Summary by category
    Object.entries(byCategory).forEach(([category, stats]) => {
      const total = stats.pass + stats.fail + stats.skip + stats.notImplemented;
      console.log(`${category}:`);
      console.log(`  Total Tests: ${total}`);
      console.log(`  ✅ Passed: ${stats.pass}`);
      console.log(`  ❌ Failed: ${stats.fail}`);
      console.log(`  ⏭️  Skipped: ${stats.skip}`);
      console.log(`  ⚠️  Not Implemented: ${stats.notImplemented}`);
      console.log('');
    });

    // Detailed results
    console.log('='.repeat(80));
    console.log('DETAILED TEST RESULTS');
    console.log('='.repeat(80));
    console.log('');

    this.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : result.status === 'SKIP' ? '⏭️' : '⚠️';
      console.log(`${index + 1}. ${icon} [${result.category}] ${result.testName}`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
      console.log('');
    });

    // Overall statistics
    const total = this.results.length;
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const notImplemented = this.results.filter(r => r.status === 'NOT_IMPLEMENTED').length;
    const passRate = total > 0 ? (passed / (passed + failed)) * 100 : 0;

    console.log('='.repeat(80));
    console.log('OVERALL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Not Implemented: ${notImplemented}`);
    console.log(`Pass Rate (excluding not implemented): ${passRate.toFixed(1)}%`);
    console.log('='.repeat(80));
  }
}

// Run tests if executed directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.runAllTests().catch(console.error);
}

export { TestRunner };
