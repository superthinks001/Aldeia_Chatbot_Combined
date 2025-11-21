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
const supabase_js_1 = require("@supabase/supabase-js");
const sqlite3_1 = __importDefault(require("sqlite3"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path.join(__dirname, '../../../.env') });
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sqliteDb = new sqlite3_1.default.Database(path.join(__dirname, '../../../../aldeia.db'), sqlite3_1.default.OPEN_READONLY);
// Helper to promisify SQLite queries
function sqliteQuery(sql) {
    return new Promise((resolve, reject) => {
        sqliteDb.all(sql, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
}
async function migrateUsers() {
    console.log('\n📋 Migrating users...');
    try {
        const users = await sqliteQuery('SELECT * FROM users');
        console.log(`   Found ${users.length} users in SQLite`);
        if (users.length === 0) {
            console.log('   No users to migrate');
            return;
        }
        let migrated = 0;
        let skipped = 0;
        for (const user of users) {
            // Check if user already exists
            const { data: existing } = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single();
            if (existing) {
                console.log(`   ⏭️  Skipping ${user.email} (already exists)`);
                skipped++;
                continue;
            }
            // Insert user
            const { error } = await supabase
                .from('users')
                .insert({
                email: user.email,
                name: user.name,
                county: user.county,
                language: user.language || 'en',
                created_at: user.created_at,
                // Note: We don't migrate password_hash from SQLite
                // Users will need to reset passwords
            });
            if (error) {
                console.error(`   ❌ Failed to migrate ${user.email}:`, error.message);
            }
            else {
                console.log(`   ✅ Migrated ${user.email}`);
                migrated++;
            }
        }
        console.log(`\n   Summary: ${migrated} migrated, ${skipped} skipped`);
    }
    catch (error) {
        console.error('❌ User migration failed:', error);
        throw error;
    }
}
async function migrateAnalytics() {
    console.log('\n📋 Migrating analytics...');
    try {
        const analytics = await sqliteQuery('SELECT * FROM analytics ORDER BY timestamp LIMIT 1000');
        console.log(`   Found ${analytics.length} analytics events (migrating last 1000)`);
        if (analytics.length === 0) {
            console.log('   No analytics to migrate');
            return;
        }
        // Get user ID mappings (old SQLite IDs to new PostgreSQL UUIDs)
        const users = await sqliteQuery('SELECT * FROM users');
        const userMap = new Map();
        for (const user of users) {
            const { data } = await supabase
                .from('users')
                .select('id')
                .eq('email', user.email)
                .single();
            if (data) {
                userMap.set(user.id, data.id);
            }
        }
        let migrated = 0;
        // Batch insert analytics (100 at a time)
        const batchSize = 100;
        for (let i = 0; i < analytics.length; i += batchSize) {
            const batch = analytics.slice(i, i + batchSize);
            const analyticsData = batch.map(event => ({
                user_id: event.user_id ? userMap.get(event.user_id) : null,
                event_type: event.event_type,
                message: event.message || null,
                meta: event.meta ? JSON.parse(event.meta) : null,
                timestamp: event.timestamp
            }));
            const { error } = await supabase
                .from('analytics')
                .insert(analyticsData);
            if (error) {
                console.error(`   ❌ Failed to migrate batch starting at ${i}:`, error.message);
            }
            else {
                migrated += batch.length;
                console.log(`   ✅ Migrated ${migrated}/${analytics.length} events`);
            }
        }
        console.log(`\n   Summary: ${migrated} events migrated`);
    }
    catch (error) {
        console.error('❌ Analytics migration failed:', error);
        throw error;
    }
}
async function runDataMigration() {
    console.log('🚀 Starting data migration from SQLite to PostgreSQL...\n');
    console.log('⚠️  This will copy data but NOT delete from SQLite (safe operation)');
    console.log('');
    try {
        await migrateUsers();
        await migrateAnalytics();
        console.log('\n✅ Data migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Verify data in Supabase Dashboard');
        console.log('   2. Test the application with new database');
        console.log('   3. Keep SQLite as backup for now');
    }
    catch (error) {
        console.error('\n❌ Data migration failed:', error);
        process.exit(1);
    }
    finally {
        sqliteDb.close();
    }
}
runDataMigration().then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
});
