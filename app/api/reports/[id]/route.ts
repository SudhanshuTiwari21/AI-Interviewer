import "server-only";
import { and, eq } from "drizzle-orm";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Sign in first.", 401);
  const isAdmin =
    user.role === "admin" || user.role === "super_admin" || user.role === "sub_admin";

  const rows = await db
    .select()
    .from(schema.interviewReports)
    .where(
      isAdmin
        ? eq(schema.interviewReports.id, params.id)
        : and(
            eq(schema.interviewReports.id, params.id),
            eq(schema.interviewReports.userId, user.id),
          ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return fail("user_not_found", "Report not found.", 404);
  return ok({ report: row.reportData });
}
