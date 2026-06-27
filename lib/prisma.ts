// Shared Prisma client singleton. In dev, Next.js hot-reload would otherwise
// instantiate a new client on every change, exhausting the connection pool.
//
// Prisma 7 requires a driver adapter. PrismaPg wraps node-postgres (`pg`) so the
// same code runs locally and on Vercel against any Postgres host.
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  // DATABASE_URL points at Supabase's transaction-mode pooler (port 6543), which
  // tolerates far more concurrent clients than the session pooler (port 5432,
  // used only for migrations — see DIRECT_URL). Still cap `max` and release idle
  // connections quickly so stray pools (hot-reload, crashed dev servers) stay cheap.
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
