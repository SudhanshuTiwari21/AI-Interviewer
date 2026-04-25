import "server-only";

import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __hiroPgPool__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __hiroDb__: NodePgDatabase<typeof schema> | undefined;
}

function getPool(): Pool {
  if (!global.__hiroPgPool__) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL is not set. Add it to .env.local (e.g. postgres://user:pass@localhost:5432/hiro)",
      );
    }
    global.__hiroPgPool__ = new Pool({
      connectionString: url,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      max: 10,
    });
  }
  return global.__hiroPgPool__;
}

function getDb(): NodePgDatabase<typeof schema> {
  if (!global.__hiroDb__) {
    global.__hiroDb__ = drizzle(getPool(), { schema });
  }
  return global.__hiroDb__;
}

/**
 * Lazy proxy: actual Pool/Drizzle init happens on first use, not on import.
 * This keeps `next build` (which evaluates route modules) green even when
 * DATABASE_URL is unset at build time (e.g. on CI).
 */
export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_t, prop, receiver) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop as string];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

export { schema };
