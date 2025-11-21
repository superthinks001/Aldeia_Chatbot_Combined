#!/usr/bin/env ts-node
"use strict";
/**
 * Development Database Seeder
 *
 * Seeds the database with test data for development
 * DO NOT run in production!
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDevData = seedDevData;
const client_1 = require("../client");
async function seedDevData() {
    console.log('='.repeat(60));
    console.log('Seeding Development Data');
    console.log('='.repeat(60));
    try {
        // Initialize schema
        console.log('\n📦 Initializing schema...');
        await (0, client_1.initDb)();
        console.log('✅ Schema initialized');
        // Create test users
        console.log('\n👥 Creating test users...');
        const users = [
            {
                name: 'Admin User',
                email: 'admin@aldeia.test',
                county: 'San Francisco',
                language: 'en'
            },
            {
                name: 'Test User',
                email: 'test@aldeia.test',
                county: 'Los Angeles',
                language: 'en'
            },
            {
                name: 'Demo User',
                email: 'demo@aldeia.test',
                county: 'San Diego',
                language: 'en'
            },
            {
                name: 'Usuario de Prueba',
                email: 'usuario@aldeia.test',
                county: 'Monterey',
                language: 'es'
            }
        ];
        const userIds = [];
        for (const user of users) {
            const userId = await (0, client_1.addOrUpdateUser)(user);
            userIds.push(userId);
            console.log(`  ✅ Created user: ${user.email} (ID: ${userId})`);
        }
        // Create test analytics events
        console.log('\n📊 Creating analytics events...');
        const events = [
            {
                user_id: userIds[0],
                event_type: 'user_message',
                message: 'Hello, how can I help with fire recovery?',
                meta: { language: 'en', session_id: 'session-1' }
            },
            {
                user_id: userIds[0],
                event_type: 'bot_response',
                message: 'I can help you with fire recovery resources...',
                meta: { response_time_ms: 234, model: 'claude-3' }
            },
            {
                user_id: userIds[1],
                event_type: 'user_message',
                message: 'What documents do I need for FEMA assistance?',
                meta: { language: 'en', session_id: 'session-2' }
            },
            {
                user_id: userIds[1],
                event_type: 'bot_response',
                message: 'For FEMA assistance, you typically need...',
                meta: { response_time_ms: 312, model: 'claude-3' }
            },
            {
                user_id: userIds[1],
                event_type: 'handoff',
                message: 'User requested human assistance',
                meta: { reason: 'complex_question', agent: 'support-1' }
            },
            {
                user_id: userIds[2],
                event_type: 'user_message',
                message: 'Tell me about rebuilding permits',
                meta: { language: 'en', session_id: 'session-3' }
            },
            {
                user_id: userIds[2],
                event_type: 'bot_response',
                message: 'Rebuilding permits vary by county...',
                meta: { response_time_ms: 198, model: 'claude-3' }
            },
            {
                user_id: userIds[3],
                event_type: 'user_message',
                message: '¿Dónde puedo obtener ayuda financiera?',
                meta: { language: 'es', session_id: 'session-4' }
            },
            {
                user_id: userIds[3],
                event_type: 'bot_response',
                message: 'Hay varios programas de asistencia financiera...',
                meta: { response_time_ms: 276, model: 'claude-3', translated: true }
            },
            {
                event_type: 'system_startup',
                message: 'Chatbot system initialized',
                meta: { version: '1.0.0', environment: 'development' }
            }
        ];
        for (const event of events) {
            await (0, client_1.logAnalytics)(event);
        }
        console.log(`  ✅ Created ${events.length} analytics events`);
        // Verify seeded data
        console.log('\n🔍 Verifying seeded data...');
        const allUsers = await (0, client_1.getUsers)();
        console.log(`  ✅ Total users: ${allUsers.length}`);
        const summary = await (0, client_1.getAnalyticsSummary)();
        console.log('  ✅ Analytics summary:');
        summary.forEach(s => {
            console.log(`     - ${s.event_type}: ${s.count}`);
        });
        console.log('\n' + '='.repeat(60));
        console.log('✅ Development data seeded successfully!');
        console.log('='.repeat(60));
        console.log('\nTest Credentials:');
        console.log('  Email: admin@aldeia.test');
        console.log('  Email: test@aldeia.test');
        console.log('  Email: demo@aldeia.test');
        console.log('  Email: usuario@aldeia.test (Spanish)');
        console.log('\n💡 Note: These are test accounts for development only');
        console.log('='.repeat(60));
    }
    catch (error) {
        console.error('\n❌ Seeding failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}
// Run seeder
if (require.main === module) {
    seedDevData()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}
