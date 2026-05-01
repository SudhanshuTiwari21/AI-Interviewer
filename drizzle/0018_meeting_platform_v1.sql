ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_provider" text;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_room_name" text;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_status" text NOT NULL DEFAULT 'not_started';
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_started_at" timestamp with time zone;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_ended_at" timestamp with time zone;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_access_token_hash" text;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "meeting_token_expires_at" timestamp with time zone;
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "recording_status" text NOT NULL DEFAULT 'not_started';
ALTER TABLE "coaching_bookings" ADD COLUMN IF NOT EXISTS "recording_url" text;

CREATE UNIQUE INDEX IF NOT EXISTS "coaching_bookings_meeting_room_name_unique_idx"
  ON "coaching_bookings" ("meeting_room_name");

CREATE INDEX IF NOT EXISTS "coaching_bookings_meeting_status_idx"
  ON "coaching_bookings" ("meeting_status");

CREATE TABLE IF NOT EXISTS "meeting_transcripts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "coaching_bookings"("id") ON DELETE cascade,
  "speaker_role" text NOT NULL,
  "speaker_name" text,
  "transcript_text" text NOT NULL,
  "chunk_index" integer NOT NULL DEFAULT 0,
  "confidence" integer,
  "starts_at_ms" integer,
  "ends_at_ms" integer,
  "source" text NOT NULL DEFAULT 'live',
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meeting_transcripts_booking_id_idx"
  ON "meeting_transcripts" ("booking_id");
CREATE INDEX IF NOT EXISTS "meeting_transcripts_chunk_index_idx"
  ON "meeting_transcripts" ("chunk_index");
CREATE INDEX IF NOT EXISTS "meeting_transcripts_speaker_role_idx"
  ON "meeting_transcripts" ("speaker_role");

CREATE TABLE IF NOT EXISTS "meeting_moderation_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "booking_id" uuid NOT NULL REFERENCES "coaching_bookings"("id") ON DELETE cascade,
  "transcript_id" uuid REFERENCES "meeting_transcripts"("id") ON DELETE set null,
  "severity" text NOT NULL DEFAULT 'medium',
  "category" text NOT NULL,
  "title" text NOT NULL,
  "evidence_text" text NOT NULL,
  "confidence" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'open',
  "resolved_at" timestamp with time zone,
  "resolved_by" uuid,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "meeting_moderation_alerts_booking_id_idx"
  ON "meeting_moderation_alerts" ("booking_id");
CREATE INDEX IF NOT EXISTS "meeting_moderation_alerts_status_idx"
  ON "meeting_moderation_alerts" ("status");
CREATE INDEX IF NOT EXISTS "meeting_moderation_alerts_severity_idx"
  ON "meeting_moderation_alerts" ("severity");
CREATE INDEX IF NOT EXISTS "meeting_moderation_alerts_category_idx"
  ON "meeting_moderation_alerts" ("category");
