import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

const Patch = z.object({
  timezone: z.string().trim().min(2).max(80).optional(),
  emailNotifications: z.boolean().optional(),
  interviewReminders: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  defaultInterviewType: z.string().trim().min(2).max(80).optional(),
  defaultCompanyType: z.string().trim().min(2).max(80).optional(),
});

async function requireSignedInUser() {
  const session = await getSessionFromCookie();
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user || !user.emailVerified) return null;
  return user;
}

export async function GET() {
  const user = await requireSignedInUser();
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

  const rows = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, user.id))
    .limit(1);
  const row = rows[0];
  const settings = row ?? {
    userId: user.id,
    timezone: "Asia/Kolkata",
    emailNotifications: true,
    interviewReminders: true,
    marketingEmails: false,
    defaultInterviewType: null,
    defaultCompanyType: null,
  };

  return ok({ settings });
}

export async function PATCH(req: Request) {
  const user = await requireSignedInUser();
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return fail(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
    );
  }

  const payload = parsed.data;
  const [updated] = await db
    .insert(schema.userSettings)
    .values({
      userId: user.id,
      timezone: payload.timezone ?? "Asia/Kolkata",
      emailNotifications: payload.emailNotifications ?? true,
      interviewReminders: payload.interviewReminders ?? true,
      marketingEmails: payload.marketingEmails ?? false,
      defaultInterviewType: payload.defaultInterviewType ?? null,
      defaultCompanyType: payload.defaultCompanyType ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        timezone: payload.timezone,
        emailNotifications: payload.emailNotifications,
        interviewReminders: payload.interviewReminders,
        marketingEmails: payload.marketingEmails,
        defaultInterviewType: payload.defaultInterviewType,
        defaultCompanyType: payload.defaultCompanyType,
        updatedAt: new Date(),
      },
    })
    .returning();

  return ok({ settings: updated });
}
