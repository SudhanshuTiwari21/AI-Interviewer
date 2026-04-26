ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "lead_source" text NOT NULL DEFAULT 'direct';
