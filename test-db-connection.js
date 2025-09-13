/**
 * Database Connection Test Script
 * ==============================
 * 
 * This script tests the database connection and verifies that all tables exist.
 * Run this to diagnose Prisma and database issues.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  console.log('🔗 Testing database connection...');
  
  try {
    // Test basic connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    console.log('Test query result:', result);
    
    // Test if all main tables exist
    console.log('\n📊 Checking table existence...');
    
    const tables = [
      'User',
      'Profile',
      'TherapistProfile',
      'ClientProfile',
      'Appointment',
      'WellnessData',
      'JournalEntry',
      'AuditLog',
      'Notification',
      'Conversation',
      'Message'
    ];
    
    for (const table of tables) {
      try {
        const count = await prisma[table.toLowerCase()].count();
        console.log(`✅ ${table} table exists (${count} records)`);
      } catch (error) {
        console.log(`❌ ${table} table missing or inaccessible:`, error.message);
      }
    }
    
    // Test database info
    console.log('\n📋 Database information:');
    const dbInfo = await prisma.$queryRaw`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as version
    `;
    console.log(dbInfo[0]);
    
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnection();