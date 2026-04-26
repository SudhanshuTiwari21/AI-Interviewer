import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { listAuditLogs } from "@/lib/audit";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("audit.view");
  if (ctx instanceof NextResponse) return ctx;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    return fail("validation_error", "Invalid query", 400);
  }

  const logs = await listAuditLogs(parsed.data.limit);
  return ok({ logs });
}
