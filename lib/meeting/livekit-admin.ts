import "server-only";

import { RoomServiceClient } from "livekit-server-sdk";
import { liveKitHttpsBase, readLiveKitHostRaw } from "./livekit-endpoints";

function getRoomServiceClient() {
  const hostRaw = readLiveKitHostRaw();
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!hostRaw || !apiKey || !apiSecret) {
    throw new Error("Missing LIVEKIT_URL or LIVEKIT_HOST for room admin.");
  }
  return new RoomServiceClient(liveKitHttpsBase(), apiKey, apiSecret);
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
