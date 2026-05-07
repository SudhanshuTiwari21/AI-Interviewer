"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  createLocalScreenTracks,
} from "livekit-client";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { authClient } from "@/lib/auth/client";

type TokenResponse = {
  ok: boolean;
  token?: string;
  wsUrl?: string;
  role?: "candidate" | "coach";
  message?: string;
};

type ChatItem = {
  id: string;
  sender: string;
  text: string;
  mine: boolean;
};

export default function MeetingPage() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const bookingId = params.bookingId;
  const [room, setRoom] = useState<Room | null>(null);
  const [role, setRole] = useState<"candidate" | "coach" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShared, setScreenShared] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const chunkIdxRef = useRef(0);
  const participantIdRef = useRef<string | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const screenRef = useRef<HTMLVideoElement | null>(null);

  const canEndSession = role === "coach";
  const statusLabel = connected ? "Connected" : "Connecting...";

  useEffect(() => {
    let active = true;
    let joinedRoom: Room | null = null;

    async function join() {
      const me = await authClient.me();
      if (!me) {
        router.replace(`/login?next=/meeting/${encodeURIComponent(bookingId)}`);
        return;
      }
      participantIdRef.current = me.id;
      const tokenRes = await fetch("/api/meeting/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const tokenJson = (await tokenRes.json()) as TokenResponse;
      if (!tokenJson.ok || !tokenJson.token || !tokenJson.wsUrl || !tokenJson.role) {
        setError(tokenJson.message ?? "Could not join meeting.");
        return;
      }
      if (!active) return;
      setRole(tokenJson.role);
      const r = new Room();
      joinedRoom = r;
      r.on(RoomEvent.Connected, () => setConnected(true));
      r.on(RoomEvent.Disconnected, () => setConnected(false));
      r.on(RoomEvent.DataReceived, (payload, participant) => {
        const text = new TextDecoder().decode(payload);
        setChatItems((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: participant?.name ?? "Participant",
            text,
            mine: false,
          },
        ]);
      });
      r.on(RoomEvent.TrackSubscribed, (track) => {
        if (!remoteRef.current) return;
        if (track.kind === "video") {
          track.attach(remoteRef.current);
        }
      });
      await r.connect(tokenJson.wsUrl, tokenJson.token);
      await r.localParticipant.enableCameraAndMicrophone();
      const localVideo = r.localParticipant.videoTrackPublications.values().next().value?.track;
      if (localVideo && localRef.current) {
        localVideo.attach(localRef.current);
      }
      await fetch("/api/meeting/session/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      setRoom(r);
    }

    void join();
    return () => {
      active = false;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (joinedRoom) {
        void joinedRoom.disconnect();
      }
    };
  }, [bookingId, router]);

  useEffect(() => {
    if (!connected || !role) return;
    let cancelled = false;
    async function startChunkTranscription() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        recorderStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (!e.data || e.data.size === 0) return;
          const idx = chunkIdxRef.current++;
          const form = new FormData();
          form.append("bookingId", bookingId);
          if (participantIdRef.current) {
            form.append("participantIdentity", participantIdRef.current);
          }
          form.append("chunkIndex", String(idx));
          form.append("audio", new File([e.data], `meeting-chunk-${idx}.webm`, { type: e.data.type || "audio/webm" }));
          void fetch("/api/meeting/transcribe-chunk", {
            method: "POST",
            body: form,
          });
        };
        recorder.start(15_000);
      } catch {
        // best-effort in v1
      }
    }
    void startChunkTranscription();
    return () => {
      cancelled = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
      recorderStreamRef.current = null;
    };
  }, [bookingId, connected, role]);

  async function toggleMute() {
    if (!room) return;
    const next = !muted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }

  async function toggleCamera() {
    if (!room) return;
    const next = !cameraOn;
    await room.localParticipant.setCameraEnabled(next);
    setCameraOn(next);
  }

  async function toggleScreenShare() {
    if (!room) return;
    if (screenShared) {
      await room.localParticipant.setScreenShareEnabled(false);
      setScreenShared(false);
      return;
    }
    const tracks = await createLocalScreenTracks();
    const screenTrack = tracks.find((t) => t.kind === "video");
    if (screenTrack) {
      await room.localParticipant.publishTrack(screenTrack);
      if (screenRef.current) screenTrack.attach(screenRef.current);
      setScreenShared(true);
    }
  }

  async function sendChat() {
    if (!room || !chatText.trim()) return;
    const text = chatText.trim();
    await room.localParticipant.publishData(new TextEncoder().encode(text), {
      reliable: true,
    });
    setChatItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), sender: "You", text, mine: true },
    ]);
    setChatText("");
  }

  async function leaveMeeting(end = false) {
    if (end && canEndSession) {
      await fetch("/api/meeting/session/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
    }
    if (room) {
      await room.disconnect();
    }
    router.push(role === "coach" ? "/coach/sessions" : "/dashboard/coach-bookings");
  }

  return (
    <div className="container max-w-6xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>SelectWise Meeting</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-sm text-ink-600">Status: {error ? error : statusLabel}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-medium text-ink-600">Local</p>
              <video ref={localRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-black" />
            </div>
            <div className="space-y-3">
              <p className="text-xs font-medium text-ink-600">Remote</p>
              <video ref={remoteRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-black" />
            </div>
          </div>
          {screenShared ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-ink-600">Screen share</p>
              <video ref={screenRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-black" />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => void toggleMute()}>
              {muted ? "Unmute" : "Mute"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void toggleCamera()}>
              {cameraOn ? "Camera Off" : "Camera On"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void toggleScreenShare()}>
              {screenShared ? "Stop Share" : "Share Screen"}
            </Button>
            {canEndSession ? (
              <Button size="sm" onClick={() => void leaveMeeting(true)}>
                End Session
              </Button>
            ) : null}
            <Button size="sm" variant="ghost" onClick={() => void leaveMeeting(false)}>
              Leave
            </Button>
          </div>
          <div className="rounded-lg border border-ink-200 p-3">
            <p className="text-sm font-medium text-ink-900">Chat</p>
            <div className="mt-2 h-40 space-y-2 overflow-y-auto rounded bg-ink-50 p-2">
              {chatItems.map((msg) => (
                <p
                  key={msg.id}
                  className={`text-xs ${msg.mine ? "text-ink-900" : "text-ink-600"}`}
                >
                  <span className="font-medium">{msg.sender}:</span> {msg.text}
                </p>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void sendChat();
                }}
                placeholder="Type a message"
                className="h-10 flex-1 rounded-lg border border-ink-200 px-3 text-sm outline-none ring-accent-500 focus:ring-2"
              />
              <Button size="sm" onClick={() => void sendChat()}>
                Send
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
