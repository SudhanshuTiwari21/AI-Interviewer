import "server-only";

import { RoomServiceClient } from "livekit-server-sdk";

function normalizeHost(raw: string) {
  const v = raw.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

function getRoomServiceClient() {
  const hostRaw = process.env.LIVEKIT_HOST;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!hostRaw || !apiKey || !apiSecret) {
    throw new Error("Missing LiveKit env vars for room admin.");
  }
  return new RoomServiceClient(normalizeHost(hostRaw), apiKey, apiSecret);
}

/**
 * Best-effort: removes the LiveKit room (disconnects participants). Safe to call when the room no longer exists.
 */
export async function tryDeleteLiveKitRoom(roomName: string | null | undefined) {
  if (!roomName?.trim()) return;
  try {
    const svc = getRoomServiceClient();
    await svc.deleteRoom(roomName.trim());
  } catch {
    // Room may already be gone after empty timeout / webhook; ignore.
  }
}
