#!/usr/bin/env node

/**
 * Database Connection Test Script
 * Astral Core v7 - Phase 2: Database Configuration
 * 
 * This script tests the PostgreSQL database connection for the Astral Core v7 application.
 * It verifies connectivity, authentication, and basic database operations.
 * 
 * Usage: node scripts/test-db-connection.js
 * 
 * Requirements:
 * - PostgreSQL database instance created in Vercel
 * - Database connection strings available
 * - Environment variables configured (or manual entry)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for output formatting
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

class DatabaseTester {
    constructor() {
        this.connectionString = null;
        this.directConnectionString = null;
        this.pg = null;
        this.testResults = [];
    }

    log(message, color = 'reset') {
        console.log(`${colors[color]}${message}${colors.reset}`);
    }

    logSection(title) {
        this.log('\n' + '='.repeat(60), 'cyan');
        this.log(`  ${title}`, 'bright');
        this.log('='.repeat(60), 'cyan');
    }

    logTest(testName, passed, details = '') {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const statusColor = passed ? 'green' : 'red';
        this.log(`${status} ${testName}`, statusColor);
        if (details) {
            this.log(`    ${details}`, 'yellow');
        }
        this.testResults.push({ test: testName, passed, details });
    }

    async checkDependencies() {
        this.logSection('Checking Dependencies');
        
        try {
            // Try to require pg module
            this.pg = require('pg');
            this.logTest('PostgreSQL driver (pg)', true, 'Module found and loaded');
            return true;
        } catch (error) {
            this.logTest('PostgreSQL driver (pg)', false, 'Module not found - installing...');
            
            try {
                this.log('Installing pg module...', 'yellow');
                execSync('npm install pg', { stdio: 'inherit' });
                this.pg = require('pg');
                this.logTest('PostgreSQL driver installation', true, 'Successfully installed');
                return true;
            } catch (installError) {
                this.logTest('PostgreSQL driver installation', false, installError.message);
                return false;
            }
        }
    }

    loadEnvironmentVariables() {
        this.logSection('Loading Environment Variables');
        
        // Try to load from various sources
        const envFiles = ['.env.local', '.env.production.local', '.env'];
        let envLoaded = false;

        for (const envFile of envFiles) {
            const envPath = path.join(process.cwd(), envFile);
            if (fs.existsSync(envPath)) {
                try {
                    const envContent = fs.readFileSync(envPath, 'utf8');
                    const envVars = envContent.split('\n')
                        .filter(line => line.trim() && !line.startsWith('#'))
                        .reduce((acc, line) => {
                            const [key, ...valueParts] = line.split('=');
                            if (key && valueParts.length) {
                                acc[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
                            }
                            return acc;
                        }, {});
                    
                    Object.assign(process.env, envVars);
                    this.logTest(`Environment file: ${envFile}`, true, `Loaded ${Object.keys(envVars).length} variables`);
                    envLoaded = true;
                    break;
                } catch (error) {
                    this.logTest(`Environment file: ${envFile}`, false, error.message);
                }
            }
        }

        if (!envLoaded) {
            this.logTest('Environment files', false, 'No .env files found');
        }

        // Check for required database URLs
        const possibleUrls = [
            'DATABASE_URL',
            'POSTGRES_URL',
            'POSTGRES_PRISMA_URL'
        ];

        const directUrls = [
            'DIRECT_DATABASE_URL',
            'POSTGRES_URL_NON_POOLING'
        ];

        for (const urlVar of possibleUrls) {
            if (process.env[urlVar]) {
                this.connectionString = process.env[urlVar];
                this.logTest(`Connection string: ${urlVar}`, true, 'Found and loaded');
                break;
            }
        }

        for (const urlVar of directUrls) {
            if (process.env[urlVar]) {
                this.directConnectionString = process.env[urlVar];
                this.logTest(`Direct connection string: ${urlVar}`, true, 'Found and loaded');
                break;
            }
        }

        if (!this.connectionString) {
            this.logTest('Database connection string', false, 'No DATABASE_URL or POSTGRES_URL found');
            return false;
        }

        return true;
    }

    async testBasicConnection() {
        this.logSection('Testing Basic Connection');

        if (!this.connectionString) {
            this.logTest('Basic connection', false, 'No connection string available');
            return false;
        }

        const client = new this.pg.Client({
            connectionString: this.connectionString,
            ssl: this.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            this.logTest('Database connection', true, 'Successfully connected to PostgreSQL');
            
            const result = await client.query('SELECT version()');
            const version = result.rows[0].version;
            this.logTest('Database version query', true, version);
            
            await client.end();
            return true;
        } catch (error) {
            this.logTest('Database connection', false, error.message);
            try {
                await client.end();
            } catch (endError) {
                // Ignore end errors
            }
            return false;
        }
    }

    async testDirectConnection() {
        this.logSection('Testing Direct Connection (Non-pooled)');

        const connectionString = this.directConnectionString || this.connectionString;
        if (!connectionString) {
            this.logTest('Direct connection', false, 'No direct connection string available');
            return false;
        }

        const client = new this.pg.Client({
            connectionString: connectionString,
            ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            this.logTest('Direct database connection', true, 'Successfully connected');
            
            // Test database operations
            await client.query('SELECT NOW() as current_time');
            this.logTest('Time query', true, 'Current time retrieved successfully');
            
            await client.end();
            return true;
        } catch (error) {
            this.logTest('Direct database connection', false, error.message);
            try {
                await client.end();
            } catch (endError) {
                // Ignore end errors
            }
            return false;
        }
    }

    async testSchemaAccess() {
        this.logSection('Testing Schema Access');

        const client = new this.pg.Client({
            connectionString: this.connectionString,
            ssl: this.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
        });

        try {
            await client.connect();
            
            // Test schema listing
            const schemaResult = await client.query(`
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
            `);
            
            this.logTest('Schema access', true, `Found ${schemaResult.rows.length} schemas`);
            
            // Test table listing (might be empty for new database)
            const tableResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            `);
            
            this.logTest('Table listing', true, `Found ${tableResult.rows.length} tables in public schema`);
            
            await client.end();
            return true;
        } catch (error) {
            this.logTest('Schema access', false, error.message);
            try {
                await client.end();
            } catch (endError) {
                // Ignore end errors
            }
            return false;
        }
    }

    async testConnectionPool() {
        this.logSection('Testing Connection Pool');

        const { Pool } = this.pg;
        const pool = new Pool({
            connectionString: this.connectionString,
            ssl: this.connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
            max: 3, // Limit for testing
            idleTimeoutMillis: 1000,
            connectionTimeoutMillis: 2000,
        });

        try {
            const client = await pool.connect();
            this.logTest('Connection pool', true, 'Pool connection acquired');
            
            const result = await client.query('SELECT $1::text as message', ['Hello from pool']);
            this.logTest('Parameterized query', true, result.rows[0].message);
            
            client.release();
            await pool.end();
            return true;
        } catch (error) {
            this.logTest('Connection pool', false, error.message);
            try {
                await pool.end();
            } catch (endError) {
                // Ignore end errors
            }
            return false;
        }
    }

    generateReport() {
        this.logSection('Test Summary Report');
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        this.log(`Total Tests: ${totalTests}`, 'bright');
        this.log(`Passed: ${passedTests}`, 'green');
        this.log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
        this.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`, 'yellow');
        
        if (failedTests > 0) {
            this.log('\n❌ Failed Tests:', 'red');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => this.log(`  • ${r.test}: ${r.details}`, 'red'));
        }
        
        if (passedTests === totalTests) {
            this.log('\n🎉 All tests passed! Your database is ready for Phase 3.', 'green');
        } else {
            this.log('\n⚠️  Some tests failed. Please review the configuration and try again.', 'yellow');
        }
    }

    async run() {
        console.clear();
        this.log('🗄️ Database Connection Test - Astral Core v7', 'bright');
        this.log('Phase 2: Database Configuration Testing\n', 'cyan');

        try {
            // Step 1: Check dependencies
            const depsOk = await this.checkDependencies();
            if (!depsOk) {
                this.log('\n❌ Dependency check failed. Cannot continue.', 'red');
                return;
            }

            // Step 2: Load environment variables
            const envOk = this.loadEnvironmentVariables();
            if (!envOk) {
                this.log('\n❌ Environment variable loading failed. Cannot continue.', 'red');
                this.log('\n💡 Make sure you have:', 'yellow');
                this.log('  • Created a PostgreSQL database in Vercel', 'yellow');
                this.log('  • Copied the connection string to a .env file', 'yellow');
                this.log('  • Set DATABASE_URL or POSTGRES_URL variable', 'yellow');
                return;
            }

            // Step 3: Test basic connection
            await this.testBasicConnection();

            // Step 4: Test direct connection
            await this.testDirectConnection();

            // Step 5: Test schema access
            await this.testSchemaAccess();

            // Step 6: Test connection pooling
            await this.testConnectionPool();

            // Generate final report
            this.generateReport();

        } catch (error) {
            this.log(`\n💥 Unexpected error: ${error.message}`, 'red');
            console.error(error);
        }
    }
}

// Run the test if this script is executed directly
if (require.main === module) {
    const tester = new DatabaseTester();
    tester.run().catch(console.error);
}

module.exports = DatabaseTester;