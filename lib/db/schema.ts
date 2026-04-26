import {
  boolean,
  integer,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    plan: text("plan").notNull().default("free"),
    role: text("role").notNull().default("user"),
    leadSource: text("lead_source").notNull().default("direct"),
    status: text("status").notNull().default("active"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailLowerIdx: uniqueIndex("users_email_lower_idx").on(sql`LOWER(${t.email})`),
  }),
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id"),
    actorEmail: text("actor_email").notNull(),
    actorRole: text("actor_role").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    actorIdx: index("audit_logs_actor_id_idx").on(t.actorId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  }),
);

export const adminSettings = pgTable("admin_settings", {
  id: text("id").primaryKey().default("singleton"),
  data: jsonb("data").notNull().default(sql`'{}'::jsonb`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid("updated_by"),
});

export const coachingBookings = pgTable(
  "coaching_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateUserId: uuid("candidate_user_id").notNull(),
    candidateName: text("candidate_name").notNull(),
    candidateEmail: text("candidate_email").notNull(),
    techArea: text("tech_area").notNull(),
    coachId: text("coach_id").notNull(),
    coachName: text("coach_name").notNull(),
    coachEmail: text("coach_email").notNull(),
    coachTimezone: text("coach_timezone").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull().default(60),
    amountInr: integer("amount_inr").notNull(),
    paymentStatus: text("payment_status").notNull().default("paid"),
    status: text("status").notNull().default("pending"),
    coachApprovalTokenHash: text("coach_approval_token_hash"),
    coachApprovedAt: timestamp("coach_approved_at", { withTimezone: true }),
    calendarEventId: text("calendar_event_id"),
    calendarMeetingUrl: text("calendar_meeting_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    candidateIdx: index("coaching_bookings_candidate_user_id_idx").on(
      t.candidateUserId,
    ),
    coachIdx: index("coaching_bookings_coach_id_idx").on(t.coachId),
    statusIdx: index("coaching_bookings_status_idx").on(t.status),
    tokenIdx: uniqueIndex("coaching_bookings_coach_approval_token_hash_idx").on(
      t.coachApprovalTokenHash,
    ),
  }),
);

export const emailVerificationTokens = pgTable(
  "email_verification_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdIdx: index("email_verification_tokens_user_id_idx").on(t.userId),
    expiresAtIdx: index("email_verification_tokens_expires_at_idx").on(t.expiresAt),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type EmailVerificationTokenRow = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationTokenRow = typeof emailVerificationTokens.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
export type AdminSettingsRow = typeof adminSettings.$inferSelect;
export type CoachingBookingRow = typeof coachingBookings.$inferSelect;
