import "server-only";

export type MeetingParticipantRole = "candidate" | "coach";

export type EnsureMeetingArgs = {
  bookingId: string;
  roomName: string;
  candidateName: string;
  coachName: string;
  startsAtIso: string;
  durationMin: number;
};

export type IssueMeetingTokenArgs = {
  roomName: string;
  bookingId: string;
  participantId: string;
  participantName: string;
  role: MeetingParticipantRole;
  /** Scheduled session length in minutes (used for token TTL). */
  durationMin: number;
};

export type IssuedMeetingToken = {
  token: string;
  wsUrl: string;
  expiresAtIso: string;
};

export type MeetingProvider = {
  name: string;
  ensureRoom(args: EnsureMeetingArgs): Promise<{ roomName: string }>;
  issueToken(args: IssueMeetingTokenArgs): Promise<IssuedMeetingToken>;
};
