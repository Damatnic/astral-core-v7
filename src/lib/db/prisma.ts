import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Edge runtime compatible configuration
const prismaClientConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'minimal' as const,
} satisfies ConstructorParameters<typeof PrismaClient>[0];

// Create Prisma client with edge runtime support
const createPrismaClient = () => {
  const client = new PrismaClient(prismaClientConfig);
  
  // Add error handling and connection monitoring
  client.$on('error', (e) => {
    console.error('Prisma error:', e);
  });

  return client;
};

// Singleton pattern for connection reuse
const prisma = globalThis.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Connection test function
export async function testDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Database disconnected successfully');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

export default prisma;
