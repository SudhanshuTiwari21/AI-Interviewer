import "server-only";

import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import type { EnsureMeetingArgs, IssueMeetingTokenArgs, MeetingProvider } from "./provider";
import {
  liveKitMeetingTokenTtlSec,
  liveKitRoomDepartureTimeoutSec,
  liveKitRoomEmptyTimeoutSec,
} from "./livekit-room-policy";

type LiveKitConfig = {
  host: string;
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
};

function normalizeHost(raw: string) {
  const v = raw.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function normalizeWsUrl(raw: string) {
  const v = raw.trim();
  if (v.startsWith("ws://") || v.startsWith("wss://")) return v;
  if (v.startsWith("http://")) return v.replace("http://", "ws://");
  if (v.startsWith("https://")) return v.replace("https://", "wss://");
  return `wss://${v}`;
}

function getLiveKitConfig(): LiveKitConfig {
  const hostRaw = process.env.LIVEKIT_HOST;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!hostRaw || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit env vars. Set LIVEKIT_HOST, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.",
    );
  }
  return {
    host: normalizeHost(hostRaw),
    apiKey,
    apiSecret,
    wsUrl: normalizeWsUrl(hostRaw),
  };
}

function getRoomService() {
  const cfg = getLiveKitConfig();
  return new RoomServiceClient(cfg.host, cfg.apiKey, cfg.apiSecret);
}

async function ensureRoom(args: EnsureMeetingArgs) {
  const roomService = getRoomService();
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
