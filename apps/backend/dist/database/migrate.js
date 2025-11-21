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
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env') });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase configuration!');
    console.error('   Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.merge');
    process.exit(1);
}
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
async function loadMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    return files.map(file => {
        const version = parseInt(file.split('_')[0]);
        const name = file.replace('.sql', '');
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        return { version, name, sql };
    });
}
async function getMigratedVersions() {
    try {
        const { data, error } = await supabase
            .from('schema_migrations')
            .select('version');
        if (error) {
            // Table might not exist yet
            console.log('⚠️  schema_migrations table not found (this is OK for first run)');
            return [];
        }
        return data.map((row) => row.version);
    }
    catch (error) {
        console.log('⚠️  Could not check migrations (this is OK for first run)');
        return [];
    }
}
async function runMigration(migration) {
    console.log(`\n🔄 Running migration ${migration.version}: ${migration.name}`);
    try {
        // For Supabase, we need to use the REST API or SQL editor
        // Since we can't execute raw SQL directly via the client,
        // we'll use a workaround with RPC or you can run this in Supabase SQL editor
        console.log('📝 SQL to execute:');
        console.log('─'.repeat(50));
        console.log(migration.sql);
        console.log('─'.repeat(50));
        console.log('\n⚠️  IMPORTANT: For Supabase, you need to:');
        console.log('   1. Go to your Supabase Dashboard');
        console.log('   2. Click on "SQL Editor" in the left menu');
        console.log('   3. Create a new query');
        console.log('   4. Copy the SQL above');
        console.log('   5. Paste and run it');
        console.log('\n   Press Enter when done...');
        // Wait for user confirmation
        await new Promise(resolve => {
            process.stdin.once('data', () => resolve(null));
        });
        console.log('✅ Migration marked as complete');
    }
    catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error);
        throw error;
    }
}
async function runMigrations() {
    console.log('🚀 Starting database migrations...\n');
    try {
        const migrations = await loadMigrations();
        console.log(`📋 Found ${migrations.length} migration(s)`);
        const migratedVersions = await getMigratedVersions();
        console.log(`✅ Already migrated: ${migratedVersions.length} version(s)`);
        const pendingMigrations = migrations.filter(m => !migratedVersions.includes(m.version));
        if (pendingMigrations.length === 0) {
            console.log('\n✨ Database is up to date! No migrations needed.');
            return;
        }
        console.log(`\n🔨 Need to run ${pendingMigrations.length} migration(s):`);
        pendingMigrations.forEach(m => {
            console.log(`   - ${m.version}: ${m.name}`);
        });
        for (const migration of pendingMigrations) {
            await runMigration(migration);
        }
        console.log('\n✅ All migrations completed successfully!');
    }
    catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}
// Run migrations
runMigrations().then(() => {
    console.log('\n👋 Done!');
    process.exit(0);
});
