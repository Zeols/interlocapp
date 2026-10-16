import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const connectionString =
  process.env.DATABASE_URL ||
  process.env.interlocapp_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.interlocapp_POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.interlocapp_POSTGRES_URL;

if (!connectionString && process.env.NODE_ENV === 'production') {
  console.error(
    'CRÍTICO: No se encontró DATABASE_URL ni interlocapp_DATABASE_URL en las variables de entorno.'
  );
}

// Singleton para el Pool de conexiones PostgreSQL
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

// Invalidar instancia en memoria si se añadieron nuevos modelos en desarrollo
if (
  process.env.NODE_ENV !== 'production' &&
  globalForPrisma.prisma &&
  !('metodoPagoUsuario' in globalForPrisma.prisma)
) {
  globalForPrisma.prisma = undefined;
}

// Singleton para el cliente de Prisma
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
