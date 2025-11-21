"use strict";
// ====================================================================
// TEST SCRIPT TO VERIFY CLAUDE'S SUPABASE ACCESS
// File: src/tests/test-ai-database.ts
// ====================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const axios_1 = __importDefault(require("axios"));
const supabase_js_1 = require("@supabase/supabase-js");
// Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000/api/ai-db';
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'your-claude-api-key';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Create axios instance with default headers
const api = axios_1.default.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY
    }
});
// Direct Supabase client for verification
const supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY);
// Color coding for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m'
};
// Test results tracker
const testResults = {
    passed: 0,
    failed: 0,
    tests: []
};
// Helper to safely extract error messages from unknown errors
function getErrorMessage(error) {
    if (axios_1.default?.isAxiosError?.(error)) {
        const ax = error;
        return ax.response?.data?.message ?? ax.message ?? 'Axios error';
    }
    if (error instanceof Error)
        return error.message;
    try {
        return JSON.stringify(error);
    }
    catch {
        return String(error);
    }
}
// Helper function to log test results
function logTest(testName, success, details) {
    const status = success ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
    console.log(`${status} - ${testName}`);
    if (details) {
        console.log(`  ${colors.blue}Details:${colors.reset}`, details);
    }
    testResults.tests.push({ name: testName, success, details });
    if (success)
        testResults.passed++;
    else
        testResults.failed++;
}
// ====================================================================
// TEST SUITE
// ====================================================================
async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.magenta}CLAUDE-SUPABASE INTEGRATION TEST SUITE${colors.reset}`);
    console.log('='.repeat(70) + '\n');
    try {
        // Test 1: Health Check
        console.log(`${colors.yellow}Test 1: Health Check${colors.reset}`);
        try {
            const health = await api.get('/health');
            logTest('Database Connection', health.data.success, {
                status: health.data.status,
                database: health.data.database
            });
        }
        catch (error) {
            logTest('Database Connection', false, getErrorMessage(error));
        }
        // Test 2: Get Table Information
        console.log(`\n${colors.yellow}Test 2: Get Table Information${colors.reset}`);
        try {
            const tableInfo = await api.get('/table-info');
            const tables = tableInfo.data.data.tables;
            logTest('Retrieve Table List', true, {
                tableCount: tables.length,
                tables: tables.slice(0, 5).map((t) => t.name)
            });
        }
        catch (error) {
            logTest('Retrieve Table List', false, getErrorMessage(error));
        }
        // Test 3: Query Users Table
        console.log(`\n${colors.yellow}Test 3: Query Users Table${colors.reset}`);
        try {
            const users = await api.post('/query-table', {
                table: 'users',
                select: 'id, name, email, county',
                limit: 5
            });
            logTest('Query Users', true, {
                recordCount: users.data.count,
                sample: users.data.data[0]
            });
        }
        catch (error) {
            logTest('Query Users', false, getErrorMessage(error));
        }
        // Test 4: Insert Test Data
        console.log(`\n${colors.yellow}Test 4: Insert Test Data${colors.reset}`);
        const testUser = {
            name: 'Claude Test User',
            email: `claude_test_${Date.now()}@example.com`,
            county: 'Los Angeles',
            language: 'en'
        };
        let insertedUserId = null;
        try {
            const insert = await api.post('/insert', {
                table: 'users',
                data: testUser
            });
            insertedUserId = insert.data.data[0]?.data?.id;
            logTest('Insert User', true, {
                userId: insertedUserId,
                email: testUser.email
            });
        }
        catch (error) {
            logTest('Insert User', false, getErrorMessage(error));
        }
        // Test 5: Update Test Data
        if (insertedUserId) {
            console.log(`\n${colors.yellow}Test 5: Update Test Data${colors.reset}`);
            try {
                const update = await api.put('/update', {
                    table: 'users',
                    data: { name: 'Claude Updated User' },
                    filters: { id: insertedUserId }
                });
                logTest('Update User', true, {
                    updated: update.data.message
                });
            }
            catch (error) {
                logTest('Update User', false, getErrorMessage(error));
            }
        }
        // Test 6: Analytics Insertion
        console.log(`\n${colors.yellow}Test 6: Insert Analytics Data${colors.reset}`);
        try {
            const analyticsData = {
                user_id: insertedUserId,
                conversation_id: `test_conv_${Date.now()}`,
                event_type: 'test_event',
                message: 'Test message from Claude integration',
                meta: { test: true, source: 'claude' },
                sentiment_score: 0.85
            };
            const analytics = await api.post('/insert', {
                table: 'analytics',
                data: analyticsData
            });
            logTest('Insert Analytics', true, {
                conversationId: analyticsData.conversation_id
            });
        }
        catch (error) {
            logTest('Insert Analytics', false, getErrorMessage(error));
        }
        // Test 7: Complex Query with Filters
        console.log(`\n${colors.yellow}Test 7: Complex Query with Filters${colors.reset}`);
        try {
            const complexQuery = await api.post('/query-table', {
                table: 'analytics',
                select: 'id, event_type, message, created_at',
                filters: { event_type: 'test_event' },
                orderBy: 'created_at DESC',
                limit: 10
            });
            logTest('Complex Query', true, {
                recordCount: complexQuery.data.count
            });
        }
        catch (error) {
            logTest('Complex Query', false, getErrorMessage(error));
        }
        // Test 8: Execute Raw SQL
        console.log(`\n${colors.yellow}Test 8: Execute Raw SQL${colors.reset}`);
        try {
            const sqlQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(DISTINCT county) as unique_counties
        FROM users
        WHERE created_at > NOW() - INTERVAL '30 days'
      `;
            const sqlResult = await api.post('/execute-sql', {
                query: sqlQuery
            });
            logTest('Raw SQL Execution', true, {
                result: sqlResult.data.data
            });
        }
        catch (error) {
            logTest('Raw SQL Execution', false, getErrorMessage(error));
        }
        // Test 9: Batch Operations
        console.log(`\n${colors.yellow}Test 9: Batch Operations${colors.reset}`);
        try {
            const batchOps = await api.post('/batch', {
                operations: [
                    {
                        type: 'query',
                        table: 'users',
                        select: 'COUNT(*)',
                        filters: {}
                    },
                    {
                        type: 'query',
                        table: 'analytics',
                        select: 'COUNT(*)',
                        filters: {}
                    },
                    {
                        type: 'insert',
                        table: 'analytics_alerts',
                        data: {
                            alert_id: `test_alert_${Date.now()}`,
                            metric: 'test_metric',
                            current_value: 100,
                            threshold: 90,
                            operator: 'gt',
                            severity: 'low',
                            message: 'Test alert from Claude',
                            status: 'resolved'
                        }
                    }
                ]
            });
            logTest('Batch Operations', true, {
                summary: batchOps.data.summary
            });
        }
        catch (error) {
            logTest('Batch Operations', false, getErrorMessage(error));
        }
        // Test 10: Database Analytics
        console.log(`\n${colors.yellow}Test 10: Database Analytics${colors.reset}`);
        try {
            const analytics = await api.get('/analytics');
            logTest('Database Analytics', true, {
                totalTables: analytics.data.data.total_tables,
                databaseSize: analytics.data.data.database_size,
                recentActivity: analytics.data.data.recent_sql_executions
            });
        }
        catch (error) {
            logTest('Database Analytics', false, getErrorMessage(error));
        }
        // Test 11: Delete Test Data (Cleanup)
        if (insertedUserId) {
            console.log(`\n${colors.yellow}Test 11: Delete Test Data (Cleanup)${colors.reset}`);
            try {
                const deleteResult = await api.delete('/delete', {
                    data: {
                        table: 'users',
                        filters: { id: insertedUserId }
                    }
                });
                logTest('Delete User', true, {
                    deleted: deleteResult.data.message
                });
            }
            catch (error) {
                logTest('Delete User', false, getErrorMessage(error));
            }
        }
        // Test 12: Verify RPC Functions
        console.log(`\n${colors.yellow}Test 12: Verify RPC Functions${colors.reset}`);
        try {
            const rpcTest = await supabase.rpc('ai_get_database_analytics');
            logTest('RPC Functions Available', !rpcTest.error, {
                analytics: rpcTest.data
            });
        }
        catch (error) {
            logTest('RPC Functions Available', false, getErrorMessage(error));
        }
    }
    catch (error) {
        console.error(`${colors.red}Test suite error:${colors.reset}`, getErrorMessage(error));
    }
    // Print Summary
    console.log('\n' + '='.repeat(70));
    console.log(`${colors.magenta}TEST SUMMARY${colors.reset}`);
    console.log('='.repeat(70));
    console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    console.log(`Total: ${testResults.passed + testResults.failed}`);
    const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1);
    const rateColor = parseFloat(successRate) >= 80 ? colors.green : colors.red;
    console.log(`Success Rate: ${rateColor}${successRate}%${colors.reset}`);
    if (testResults.failed > 0) {
        console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
        testResults.tests
            .filter(t => !t.success)
            .forEach(t => console.log(`  - ${t.name}: ${t.details}`));
    }
    console.log('\n' + '='.repeat(70) + '\n');
    // Return success status
    return testResults.failed === 0;
}
// ====================================================================
// RUN TESTS
// ====================================================================
// Run tests if executed directly
if (require.main === module) {
    runTests()
        .then(success => {
        process.exit(success ? 0 : 1);
    })
        .catch(error => {
        console.error('Fatal error:', getErrorMessage(error));
        process.exit(1);
    });
}
// ====================================================================
// USAGE INSTRUCTIONS
// ====================================================================
/*
1. Install dependencies:
   npm install axios @supabase/supabase-js

2. Set environment variables:
   export SUPABASE_URL="your_supabase_url"
   export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
   export API_URL="http://localhost:4000/api/ai-db"
   export CLAUDE_API_KEY="optional_claude_api_key"

3. Run the test:
   npx ts-node src/tests/test-ai-database.ts

4. Or integrate in your Express app:
   import { runTests } from './tests/test-ai-database';
   
   app.get('/api/test-claude-access', async (req, res) => {
     const success = await runTests();
     res.json({ success, message: success ? 'All tests passed' : 'Some tests failed' });
   });
*/ 
