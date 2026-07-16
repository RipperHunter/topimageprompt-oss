import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

let prisma;
if (globalForPrisma.prisma) {
  prisma = globalForPrisma.prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error'] : ['error'],
  });

  // Apply SQLite optimizations for performance and concurrency
  Promise.all([
    prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;'),
    prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;'),
    prisma.$queryRawUnsafe('PRAGMA cache_size=-8000;'),   // 8MB page cache
    prisma.$queryRawUnsafe('PRAGMA temp_store=MEMORY;'),  // temp tables in RAM
    prisma.$queryRawUnsafe('PRAGMA mmap_size=134217728;'), // 128MB memory map
  ]).catch(err => {
    console.error('[prisma] Failed to apply SQLite optimizations:', err.message);
  });

  // ✅ Cache in ALL environments — prevents new client per request
  globalForPrisma.prisma = prisma;
}

export default prisma;
