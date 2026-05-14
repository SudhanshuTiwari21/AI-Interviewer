import "server-only";

import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import { fail, ok } from "@/lib/api/response";
import { deleteCoach, listCoaches, upsertCoach } from "@/lib/server/coaches";
import type { Coach } from "@/lib/coaches";
import { db, schema } from "@/lib/db/client";
import { findUserByEmail } from "@/lib/auth/verification-service";
import { sendMail } from "@/lib/email/transporter";
import { coachOnboardingEmail } from "@/lib/email/templates/coaching";
import { isValidIanaTimeZone } from "@/lib/timezone";

export const runtime = "nodejs";
const MAX_COACH_DESCRIPTION_WORDS = 120;

function appBase() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function descriptionWordCount(value: string) {
  const normalized = value.trim();
  if (!normalized) return 0;
  return normalized.split(/\s+/).length;
}

/** Prefer user-facing field order so e.g. empty `name` is reported before empty `id`. */
function coachValidationMessage(err: z.ZodError): string {
  const issues = err.issues;
  const pathPriority = [
    "name",
    "title",
    "email",
    "timezone",
    "techAreas",
    "availability",
    "id",
    "description",
    "sessions",
    "perSessionRateInr",
    "active",
    "focus",
  ];
  const sorted = [...issues].sort((a, b) => {
    const ia = pathPriority.indexOf(String(a.path[0] ?? ""));
    const ib = pathPriority.indexOf(String(b.path[0] ?? ""));
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return sorted[0]?.message ?? "Invalid input";
}

const CoachSchema = z.object({
  id: z.string().trim().min(1, "Coach id is required.").max(120),
  name: z.string().trim().min(1, "Coach name is required.").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  title: z.string().trim().min(1, "Coach title is required.").max(200),
  description: z
    .string()
    .trim()
    .min(60, "Description must be at least 60 characters.")
    .max(5000)
    .refine(
      (value) => descriptionWordCount(value) <= MAX_COACH_DESCRIPTION_WORDS,
      `Description can have at most ${MAX_COACH_DESCRIPTION_WORDS} words.`,
    ),
  sessions: z.number().int().min(0),
  focus: z.array(z.string()),
  techAreas: z
    .array(z.string().trim().min(1, "Tech area cannot be empty."))
    .min(1, "Select at least one tech area."),
  perSessionRateInr: z.number().int().positive(),
  active: z.boolean(),
  timezone: z
    .string()
    .trim()
    .min(1, "Timezone is required.")
    .max(120, "Timezone is too long.")
    .refine(isValidIanaTimeZone, {
      message:
        "Invalid timezone. Use an IANA name such as Asia/Kolkata, America/New_York, or Europe/London.",
    }),
  availability: z.object({
    weekdays: z.array(z.number().int()).min(1, "Select at least one weekday."),
    windows: z
      .array(
        z.object({
          startMinute: z.number().int(),
          endMinute: z.number().int(),
        }),
      )
      .min(1, "Add at least one availability window.")
      .superRefine((windows, ctx) => {
        windows.forEach((w, i) => {
          if (w.endMinute <= w.startMinute) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "End time must be greater than start time for every availability window.",
              path: [i, "endMinute"],
            });
          }
          if (w.endMinute - w.startMinute < 30) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Each availability window must be at least 30 minutes long.",
              path: [i, "endMinute"],
            });
          }
        });
      }),
  }),
});

export async function GET() {
  const ctx = await requirePermission("coaches.view");
  if (ctx instanceof NextResponse) return ctx;
  const coaches = await listCoaches();
  return ok({ coaches });
}

export async function POST(req: Request) {
  const ctx = await requirePermission("coaches.update");
  if (ctx instanceof NextResponse) return ctx;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = CoachSchema.safeParse(json);
  if (!parsed.success) {
    return fail("validation_error", coachValidationMessage(parsed.error), 400);
  }
  const coach = {
    ...parsed.data,
    rating: 0,
  } as Coach;
  const existing = await findUserByEmail(coach.email);
  if (!existing) {
    return fail(
      "validation_error",
      "Coach email is not registered. Ask this user to sign up first, then add as coach.",
      400,
    );
  }

  const emailLower = coach.email.trim().toLowerCase();
  const otherCoachSameEmail = await db
    .select({ id: schema.coaches.id })
    .from(schema.coaches)
    .where(
      and(sql`LOWER(${schema.coaches.email}) = ${emailLower}`, ne(schema.coaches.id, coach.id)),
    )
    .limit(1);
  if (otherCoachSameEmail.length > 0) {
    return fail(
      "coach_already_exists",
      "Coach already exists with this email/User ID.",
      409,
    );
  }

  await upsertCoach(coach);
  const promotedToCoach = existing.role !== "coach";
  if (existing.role !== "coach") {
    await db
      .update(schema.users)
      .set({
        role: "coach",
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, existing.id));
  }

  if (promotedToCoach) {
    const dashboardUrl = `${appBase()}/coach`;
    const mail = coachOnboardingEmail({
      coachName: coach.name,
      coachEmail: coach.email,
      dashboardUrl,
      supportEmail: process.env.SUPPORT_EMAIL ?? process.env.ADMIN_EMAIL ?? null,
    });
    try {
      await sendMail({
        to: coach.email,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    } catch (err) {
      console.error("[admin/coaches:onboarding-email]", err);
    }
  }

  return ok({
    saved: true,
    promotedCoach: promotedToCoach,
    requiresEmailVerification: !existing.emailVerified,
  });
}

export async function DELETE(req: Request) {
  const ctx = await requirePermission("coaches.delete");
  if (ctx instanceof NextResponse) return ctx;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return fail("validation_error", "Coach id is required.", 400);
  const coaches = await listCoaches();
  const coach = coaches.find((x) => x.id === id);
  await deleteCoach(id);
  if (coach?.email) {
    const existing = await findUserByEmail(coach.email);
    if (existing?.role === "coach") {
      await db
        .update(schema.users)
        .set({
          role: "user",
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id));
    }
  }
  return ok({ deleted: true });
}
