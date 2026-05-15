/** Default session length when coach has no custom slot step. */
export const DEFAULT_COACHING_SESSION_MINUTES = 30;

/** Temporary hold while a candidate selects a slot and completes payment. */
export const COACHING_SLOT_HOLD_MINUTES = 2;

/** How many minutes before `startsAt` users may join (matches MEETING_JOIN_EARLY_MIN server default). */
export const COACHING_JOIN_EARLY_MINUTES = 60;

/** Grace after session end for token issuance (server MEETING_JOIN_LATE_MIN). */
export const COACHING_JOIN_LATE_MINUTES = 120;
