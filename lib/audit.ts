import "server-only";

import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { AdminContext } from "@/lib/auth/admin";

type LogArgs = {
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Persists an audit row. Audit failures should never crash a request, so
 * any error is swallowed and printed to the server console instead.
 */
export async function recordAudit(ctx: AdminContext, args: LogArgs): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      actorId: ctx.user.id,
      actorEmail: ctx.user.email,
      actorRole: ctx.role,
      action: args.action,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      metadata: args.metadata ?? {},
      ip: args.ip ?? null,
    });
  } catch (err) {
    console.error("[audit] failed to record event", args.action, err);
  }
}

export async function listAuditLogs(limit = 100) {
  return db
    .select()
    .from(schema.auditLogs)
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);
}
