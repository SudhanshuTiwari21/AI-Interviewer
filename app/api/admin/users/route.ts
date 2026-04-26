import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, ilike, or, sql, count } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Query = z.object({
  q: z.string().trim().optional(),
  role: z
    .enum(["super_admin", "admin", "sub_admin", "user", "all"])
    .optional()
    .default("all"),
  status: z.enum(["active", "suspended", "all"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export async function GET(req: NextRequest) {
  const ctx = await requirePermission("users.view");
  if (ctx instanceof NextResponse) return ctx;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = Query.safeParse(params);
  if (!parsed.success) {
    return fail(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid query",
      400,
    );
  }

  const { q, role, status, page, pageSize } = parsed.data;
  const filters: ReturnType<typeof sql>[] = [];
  if (q) {
    const like = `%${q}%`;
    const orClause = or(ilike(schema.users.email, like), ilike(schema.users.name, like));
    if (orClause) filters.push(orClause);
  }
  if (role !== "all") filters.push(sql`${schema.users.role} = ${role}`);
  if (status !== "all") filters.push(sql`${schema.users.status} = ${status}`);

  const where = filters.length > 0 ? sql.join(filters, sql` AND `) : sql`TRUE`;

  const offset = (page - 1) * pageSize;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        name: schema.users.name,
        role: schema.users.role,
        leadSource: schema.users.leadSource,
        plan: schema.users.plan,
        status: schema.users.status,
        emailVerified: schema.users.emailVerified,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(pageSize)
      .offset(offset),
    db.select({ value: count() }).from(schema.users).where(where),
  ]);

  return ok({
    users: rows,
    pagination: {
      page,
      pageSize,
      total: Number(totals[0]?.value ?? 0),
    },
  });
}
