import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { listAllReports, listReportsForUser, saveInterviewReport } from "@/lib/server/reports";
import type { InterviewReport } from "@/lib/question-engine";

export const runtime = "nodejs";

const Body = z.object({
  report: z.any(),
});

export async function GET() {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Sign in first.", 401);
  const isAdmin =
    user.role === "admin" || user.role === "super_admin" || user.role === "sub_admin";
  const reports = isAdmin ? await listAllReports() : await listReportsForUser(user.id);
  return ok({ reports });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Sign in first.", 401);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", "Invalid report payload", 400);
  }
  await saveInterviewReport({ userId: user.id, report: parsed.data.report as InterviewReport });
  return ok({ saved: true }, 201);
}
