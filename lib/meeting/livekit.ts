import "server-only";

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type { EnsureMeetingArgs, IssueMeetingTokenArgs, MeetingProvider } from "./provider";
import {
  liveKitMeetingTokenTtlSec,
  liveKitRoomDepartureTimeoutSec,
  liveKitRoomEmptyTimeoutSec,
} from "./livekit-room-policy";
import { liveKitHttpsBase, liveKitWssBase, readLiveKitHostRaw } from "./livekit-endpoints";

type LiveKitConfig = {
  host: string;
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
};

function getLiveKitConfig(): LiveKitConfig {
  const hostRaw = readLiveKitHostRaw();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!hostRaw || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit env vars. Set LIVEKIT_URL (or LIVEKIT_HOST), LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
    );
  }
  return {
    host: liveKitHttpsBase(),
    apiKey,
    apiSecret,
    wsUrl: liveKitWssBase(),
  };
}

function getRoomService() {
  const cfg = getLiveKitConfig();
  return new RoomServiceClient(cfg.host, cfg.apiKey, cfg.apiSecret);
}

async function ensureRoom(args: EnsureMeetingArgs) {
  const roomService = getRoomService();
  try {
    const room = await roomService.createRoom({
      name: args.roomName,
      metadata: JSON.stringify({
        bookingId: args.bookingId,
        candidateName: args.candidateName,
        coachName: args.coachName,
        startsAtIso: args.startsAtIso,
        durationMin: args.durationMin,
        createdBy: "selectwise",
      }),
      emptyTimeout: liveKitRoomEmptyTimeoutSec(),
      departureTimeout: liveKitRoomDepartureTimeoutSec(),
      maxParticipants: 2,
    });
    return { roomName: room.name };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/already exists|AlreadyExists|409|duplicate/i.test(msg)) {
      return { roomName: args.roomName };
    }
    throw err;
  }
}

async function issueToken(args: IssueMeetingTokenArgs) {
  const cfg = getLiveKitConfig();
  const expiresInSec = liveKitMeetingTokenTtlSec(args.durationMin);
  const at = new AccessToken(cfg.apiKey, cfg.apiSecret, {
    identity: args.participantId,
    name: args.participantName,
    ttl: `${expiresInSec}s`,
    metadata: JSON.stringify({
      bookingId: args.bookingId,
      role: args.role,
    }),
  });
  at.addGrant({
    room: args.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  const token = await at.toJwt();
  return {
    token,
    wsUrl: cfg.wsUrl,
    expiresAtIso: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  };
}

export const liveKitProvider: MeetingProvider = {
  name: "livekit",
  ensureRoom,
  issueToken,
};
