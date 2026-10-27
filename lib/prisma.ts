import { Prisma, PrismaClient } from "@prisma/client";

// Errors where the query never reached the database, so retrying can't
// double-apply a write: couldn't open a connection, timed out waiting for one
// from the pool, or the pooler dropped the connection before use.
const RETRYABLE_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);
const RETRYABLE_MESSAGE = /Can't reach database server|Timed out fetching a new connection|Connection reset|ECONNRESET|server has closed the connection/i;
const MAX_RETRIES = 2;

function isRetryable(err: unknown) {
  if (err instanceof Prisma.PrismaClientKnownRequestError) return RETRYABLE_CODES.has(err.code);
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  return err instanceof Error && RETRYABLE_MESSAGE.test(err.message);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Supabase's pooler occasionally refuses or drops a connection for a moment.
  // Retry those transparently (with backoff) instead of failing the page.
  return base.$extends({
    query: {
      async $allOperations({ args, query, operation, model }) {
        for (let attempt = 0; ; attempt++) {
          try {
            return await query(args);
          } catch (err) {
            if (attempt >= MAX_RETRIES || !isRetryable(err)) throw err;
            console.warn(`[prisma] ${model ?? ""}.${operation} connection error, retrying (${attempt + 1}/${MAX_RETRIES})`);
            await sleep(300 * 2 ** attempt);
          }
        }
      },
    },
  });
}

type ExtendedClient = ReturnType<typeof createClient>;

// Reuse one client across hot reloads in dev so we don't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
