import "server-only";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/admin";
import {
  getAdminSettings,
  updateAdminSettings,
  type AdminSettings,
} from "@/lib/admin-settings";
import { recordAudit } from "@/lib/audit";
import { fail, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const Patch = z.object({
  pricePerInterviewInr: z.number().int().positive().max(100000).optional(),
  banner: z
    .object({
      enabled: z.boolean(),
      message: z.string().max(280),
      tone: z.enum(["info", "warn", "success"]),
    })
    .optional(),
  maintenanceMode: z.boolean().optional(),
  supportEmail: z.string().trim().email().max(160).optional(),
  allowSignups: z.boolean().optional(),
  coachingTechnologyCategories: z
    .array(z.string().trim().min(1).max(80))
    .max(100)
    .optional(),
  targetRoles: z.array(z.string().trim().min(1).max(120)).max(300).optional(),
});

export async function GET() {
  const ctx = await requirePermission("settings.view");
  if (ctx instanceof NextResponse) return ctx;
  const settings = await getAdminSettings();
  return ok({ settings });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requirePermission("settings.update");
  if (ctx instanceof NextResponse) return ctx;

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

  const previous = await getAdminSettings();
  const next = await updateAdminSettings(
    parsed.data as Partial<AdminSettings>,
    ctx.user.id,
  );

  await recordAudit(ctx, {
    action: "settings.update",
    targetType: "settings",
    metadata: { changes: parsed.data, previous },
  });

  return ok({ settings: next });
}
