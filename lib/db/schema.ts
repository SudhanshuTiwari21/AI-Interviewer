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
    durationMin: integer("duration_min").notNull().default(30),
    amountInr: integer("amount_inr").notNull(),
    paymentStatus: text("payment_status").notNull().default("paid"),
    paymentTransactionId: uuid("payment_transaction_id"),
    razorpayOrderId: text("razorpay_order_id"),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpayRefundId: text("razorpay_refund_id"),
    status: text("status").notNull().default("pending"),
    refundReason: text("refund_reason"),
    refundRequestedAt: timestamp("refund_requested_at", { withTimezone: true }),
    refundReviewedAt: timestamp("refund_reviewed_at", { withTimezone: true }),
    refundProcessedAt: timestamp("refund_processed_at", { withTimezone: true }),
    coachApprovalTokenHash: text("coach_approval_token_hash"),
    feedbackTokenHash: text("feedback_token_hash"),
    feedbackRequestedAt: timestamp("feedback_requested_at", { withTimezone: true }),
    feedbackSubmittedAt: timestamp("feedback_submitted_at", { withTimezone: true }),
    coachApprovedAt: timestamp("coach_approved_at", { withTimezone: true }),
    calendarEventId: text("calendar_event_id"),
    calendarMeetingUrl: text("calendar_meeting_url"),
    meetingProvider: text("meeting_provider"),
    meetingRoomName: text("meeting_room_name"),
    meetingStatus: text("meeting_status").notNull().default("not_started"), // not_started | active | ended
    meetingStartedAt: timestamp("meeting_started_at", { withTimezone: true }),
    meetingEndedAt: timestamp("meeting_ended_at", { withTimezone: true }),
    meetingAccessTokenHash: text("meeting_access_token_hash"),
    meetingTokenExpiresAt: timestamp("meeting_token_expires_at", { withTimezone: true }),
    recordingStatus: text("recording_status").notNull().default("not_started"), // not_started | recording | completed | failed
    recordingUrl: text("recording_url"),
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
    coachSlotUniqueIdx: uniqueIndex("coaching_bookings_coach_slot_unique_idx").on(
      t.coachId,
      t.startsAt,
    ),
    statusIdx: index("coaching_bookings_status_idx").on(t.status),
    tokenIdx: uniqueIndex("coaching_bookings_coach_approval_token_hash_idx").on(
      t.coachApprovalTokenHash,
    ),
    feedbackTokenIdx: uniqueIndex("coaching_bookings_feedback_token_hash_idx").on(
      t.feedbackTokenHash,
    ),
    roomNameIdx: uniqueIndex("coaching_bookings_meeting_room_name_unique_idx").on(
      t.meetingRoomName,
    ),
    meetingStatusIdx: index("coaching_bookings_meeting_status_idx").on(t.meetingStatus),
  }),
);

export const coachingFeedback = pgTable(
  "coaching_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => coachingBookings.id, { onDelete: "cascade" }),
    coachId: text("coach_id").notNull(),
    candidateUserId: uuid("candidate_user_id").notNull(),
    candidateName: text("candidate_name").notNull(),
    rating: integer("rating").notNull(),
    feedbackText: text("feedback_text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bookingUniqueIdx: uniqueIndex("coaching_feedback_booking_id_unique_idx").on(t.bookingId),
    coachIdx: index("coaching_feedback_coach_id_idx").on(t.coachId),
    ratingIdx: index("coaching_feedback_rating_idx").on(t.rating),
  }),
);

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productType: text("product_type").notNull(), // interview | coaching
    referenceId: text("reference_id"),
    amountInr: integer("amount_inr").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: text("status").notNull().default("created"), // created | paid | failed
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id"),
    razorpaySignature: text("razorpay_signature"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("payment_transactions_user_id_idx").on(t.userId),
    statusIdx: index("payment_transactions_status_idx").on(t.status),
    productIdx: index("payment_transactions_product_type_idx").on(t.productType),
  }),
);

export const razorpayWebhookEvents = pgTable(
  "razorpay_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull().unique(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default(sql`'{}'::jsonb`),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingStatus: text("processing_status").notNull().default("received"), // received | processed | ignored | failed
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    eventTypeIdx: index("razorpay_webhook_events_event_type_idx").on(t.eventType),
    statusIdx: index("razorpay_webhook_events_status_idx").on(t.processingStatus),
  }),
);

export const refundEvents = pgTable(
  "refund_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => coachingBookings.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // requested | approved | rejected | webhook_update
    actorEmail: text("actor_email"),
    actorRole: text("actor_role"),
    note: text("note"),
    amountInr: integer("amount_inr"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bookingIdx: index("refund_events_booking_id_idx").on(t.bookingId),
    typeIdx: index("refund_events_event_type_idx").on(t.eventType),
  }),
);

export const meetingTranscripts = pgTable(
  "meeting_transcripts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => coachingBookings.id, { onDelete: "cascade" }),
    speakerRole: text("speaker_role").notNull(), // coach | candidate | system
    speakerName: text("speaker_name"),
    transcriptText: text("transcript_text").notNull(),
    chunkIndex: integer("chunk_index").notNull().default(0),
    confidence: integer("confidence"), // 0-100
    startsAtMs: integer("starts_at_ms"),
    endsAtMs: integer("ends_at_ms"),
    source: text("source").notNull().default("live"), // live | post_session
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bookingIdx: index("meeting_transcripts_booking_id_idx").on(t.bookingId),
    chunkIdx: index("meeting_transcripts_chunk_index_idx").on(t.chunkIndex),
    roleIdx: index("meeting_transcripts_speaker_role_idx").on(t.speakerRole),
  }),
);

export const meetingModerationAlerts = pgTable(
  "meeting_moderation_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => coachingBookings.id, { onDelete: "cascade" }),
    transcriptId: uuid("transcript_id").references(() => meetingTranscripts.id, {
      onDelete: "set null",
    }),
    severity: text("severity").notNull().default("medium"), // low | medium | high
    category: text("category").notNull(), // poaching | contact_sharing | policy
    title: text("title").notNull(),
    evidenceText: text("evidence_text").notNull(),
    confidence: integer("confidence").notNull().default(0),
    status: text("status").notNull().default("open"), // open | resolved | dismissed
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bookingIdx: index("meeting_moderation_alerts_booking_id_idx").on(t.bookingId),
    statusIdx: index("meeting_moderation_alerts_status_idx").on(t.status),
    severityIdx: index("meeting_moderation_alerts_severity_idx").on(t.severity),
    categoryIdx: index("meeting_moderation_alerts_category_idx").on(t.category),
  }),
);

export const coaches = pgTable(
  "coaches",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    rating: integer("rating").notNull().default(0), // legacy field, computed rating is feedback-based
    sessions: integer("sessions").notNull().default(0),
    focus: jsonb("focus").notNull().default(sql`'[]'::jsonb`),
    techAreas: jsonb("tech_areas").notNull().default(sql`'[]'::jsonb`),
    perSessionRateInr: integer("per_session_rate_inr").notNull().default(999),
    active: boolean("active").notNull().default(true),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    availability: jsonb("availability").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    activeIdx: index("coaches_active_idx").on(t.active),
  }),
);

export const interviewReports = pgTable(
  "interview_reports",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    candidate: text("candidate").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    level: text("level").notNull(),
    overall: integer("overall").notNull(),
    rating: text("rating").notNull(),
    durationMin: integer("duration_min").notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    reportData: jsonb("report_data").notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("interview_reports_user_id_idx").on(t.userId),
    generatedIdx: index("interview_reports_generated_at_idx").on(t.generatedAt),
  }),
);

export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    emailNotifications: boolean("email_notifications").notNull().default(true),
    interviewReminders: boolean("interview_reminders").notNull().default(true),
    marketingEmails: boolean("marketing_emails").notNull().default(false),
    defaultInterviewType: text("default_interview_type"),
    defaultCompanyType: text("default_company_type"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUniqueIdx: uniqueIndex("user_settings_user_id_unique_idx").on(t.userId),
    userIdx: index("user_settings_user_id_idx").on(t.userId),
  }),
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    userName: text("user_name").notNull(),
    category: text("category").notNull(), // payment | refund | account | coaching | technical | custom
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("open"), // open | in_progress | resolved | closed
    priority: text("priority").notNull().default("medium"), // low | medium | high
    adminNote: text("admin_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index("support_tickets_user_id_idx").on(t.userId),
    statusIdx: index("support_tickets_status_idx").on(t.status),
    categoryIdx: index("support_tickets_category_idx").on(t.category),
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

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
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
    userIdIdx: index("password_reset_tokens_user_id_idx").on(t.userId),
    expiresAtIdx: index("password_reset_tokens_expires_at_idx").on(t.expiresAt),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type EmailVerificationTokenRow = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationTokenRow = typeof emailVerificationTokens.$inferInsert;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetTokenRow = typeof passwordResetTokens.$inferInsert;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
export type AdminSettingsRow = typeof adminSettings.$inferSelect;
export type CoachingBookingRow = typeof coachingBookings.$inferSelect;
export type CoachRow = typeof coaches.$inferSelect;
export type InterviewReportRow = typeof interviewReports.$inferSelect;
export type PaymentTransactionRow = typeof paymentTransactions.$inferSelect;
export type RazorpayWebhookEventRow = typeof razorpayWebhookEvents.$inferSelect;
export type RefundEventRow = typeof refundEvents.$inferSelect;
export type CoachingFeedbackRow = typeof coachingFeedback.$inferSelect;
export type MeetingTranscriptRow = typeof meetingTranscripts.$inferSelect;
export type MeetingModerationAlertRow = typeof meetingModerationAlerts.$inferSelect;
export type UserSettingsRow = typeof userSettings.$inferSelect;
export type SupportTicketRow = typeof supportTickets.$inferSelect;
