import { PrismaClient } from '@prisma/client';

console.log('Initializing Prisma Client...');
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

export default prisma;
