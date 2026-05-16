import "server-only";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { INTERVIEW_PRICE_INR } from "@/lib/plan-access";
import { TARGET_ROLES } from "@/lib/target-roles";

export type AdminSettings = {
  /** Flat per-interview price in INR. */
  pricePerInterviewInr: number;
  /** Optional global banner shown on the marketing site / dashboard. */
  banner?: {
    enabled: boolean;
    message: string;
    tone: "info" | "warn" | "success";
  };
  /** When true, candidate flows redirect to a maintenance screen. */
  maintenanceMode: boolean;
  /** Free-form support email shown in receipts. */
  supportEmail: string;
  /** Allow signups from the public landing page. */
  allowSignups: boolean;
  /** Coaching technologies shown on schedule page. */
  coachingTechnologyCategories: string[];
  /** Shared role list used across interview + coaching flows. */
  targetRoles: string[];
};

export const DEFAULT_SETTINGS: AdminSettings = {
  pricePerInterviewInr: INTERVIEW_PRICE_INR,
  banner: { enabled: false, message: "", tone: "info" },
  maintenanceMode: false,
  supportEmail: "hi@selectwise.app",
  allowSignups: true,
  coachingTechnologyCategories: [
    "Frontend",
    "Backend",
    "Full Stack",
    "Java",
    "Python",
    "DevOps",
    "Data Engineering",
    "Data Science",
    "AI/ML",
    "Product Management",
    "System Design",
    "Cloud",
    "QA Automation",
  ],
  targetRoles: [...TARGET_ROLES],
};

const ROW_ID = "singleton";

export async function getAdminSettings(): Promise<AdminSettings> {
  try {
    const rows = await db
      .select()
      .from(schema.adminSettings)
      .where(eq(schema.adminSettings.id, ROW_ID))
      .limit(1);
    const row = rows[0];
    if (!row) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS,
      ...((row.data ?? {}) as Partial<AdminSettings>),
    };
  } catch (err) {
    console.error("[admin-settings] failed to read", err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateAdminSettings(
  patch: Partial<AdminSettings>,
  updatedBy: string,
): Promise<AdminSettings> {
  const current = await getAdminSettings();
  const next: AdminSettings = { ...current, ...patch };
  await db
    .insert(schema.adminSettings)
    .values({
      id: ROW_ID,
      data: next as unknown as Record<string, unknown>,
      updatedAt: new Date(),
      updatedBy,
    })
    .onConflictDoUpdate({
      target: schema.adminSettings.id,
      set: {
        data: next as unknown as Record<string, unknown>,
        updatedAt: new Date(),
        updatedBy,
      },
    });
  return next;
}
