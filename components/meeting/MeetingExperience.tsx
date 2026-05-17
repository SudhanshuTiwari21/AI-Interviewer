"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Room,
  RoomEvent,
  Track,
  createLocalAudioTrack,
  isRemoteParticipant,
  type LocalAudioTrack,
  type LocalTrackPublication,
  type LocalVideoTrack,
  type RemoteAudioTrack,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from "livekit-client";
import {
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreVertical,
  PhoneOff,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
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

function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0]!.slice(0, 2).toUpperCase();
  return (p[0]![0] + p[p.length - 1]![0]).toUpperCase();
}

function micPublicationOn(p: RemoteParticipant) {
  return p.getTrackPublication(Track.Source.Microphone);
}

function camPublicationOn(p: RemoteParticipant) {
  return p.getTrackPublication(Track.Source.Camera);
}

function screenPublicationOn(p: RemoteParticipant) {
  return p.getTrackPublication(Track.Source.ScreenShare);
}

function isLiveMic(p: RemoteParticipant) {
  const pub = micPublicationOn(p);
  return !!(pub?.track && !pub.track.isMuted);
}

function isLiveCamera(p: RemoteParticipant) {
  const pub = camPublicationOn(p);
  return !!(pub?.track && !pub.track.isMuted);
}

function isLiveRemoteScreen(p: RemoteParticipant) {
  const pub = screenPublicationOn(p);
  return !!(pub?.track && !pub.track.isMuted);
}

type MeetControlProps = {
  active: boolean;
  danger?: boolean;
  presenting?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
};

function MeetControl({
  active,
  danger,
  presenting,
  label,
  onClick,
  children,
}: Readonly<MeetControlProps>) {
  let ring = "flex size-12 shrink-0 items-center justify-center rounded-full transition-colors ";
  if (danger) {
    ring += "bg-[#ea4335] text-white hover:bg-[#f55f4b]";
  } else if (presenting) {
    ring +=
      "bg-[#3c4043] text-white ring-2 ring-[#1e8e3e] ring-offset-2 ring-offset-[#202124] hover:bg-[#4a4d51]";
  } else if (active) {
    ring += "bg-[#3c4043] text-white hover:bg-[#4a4d51]";
  } else {
    ring += "bg-[#ea4335] text-white hover:bg-[#f55f4b]";
  }
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={ring}>
      {children}
    </button>
  );
}

export default function MeetingExperience({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [role, setRole] = useState<"candidate" | "coach" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const [localMicOn, setLocalMicOn] = useState(true);
  const [localCamOn, setLocalCamOn] = useState(true);
  const [localScreenOn, setLocalScreenOn] = useState(false);

  const [remoteParticipant, setRemoteParticipant] = useState<RemoteParticipant | null>(null);
  const [remoteMicOn, setRemoteMicOn] = useState(true);
  const [remoteCamOn, setRemoteCamOn] = useState(true);
  const [remoteScreenOn, setRemoteScreenOn] = useState(false);
  const [remoteLabel, setRemoteLabel] = useState("Guest");

  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const chunkIdxRef = useRef(0);
  const participantIdRef = useRef<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteCameraRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const screenShareRef = useRef<HTMLVideoElement | null>(null);

  const roomRef = useRef<Room | null>(null);
  const bumpRemote = useCallback((p: RemoteParticipant | null) => {
    setRemoteParticipant(p);
    if (!p) {
      setRemoteMicOn(true);
      setRemoteCamOn(true);
      setRemoteScreenOn(false);
      setRemoteLabel("Guest");
      return;
    }
    setRemoteLabel(p.name?.trim() || "Guest");
    setRemoteMicOn(isLiveMic(p));
    setRemoteCamOn(isLiveCamera(p));
    setRemoteScreenOn(isLiveRemoteScreen(p));
  }, []);

  const bumpLocal = useCallback((r: Room) => {
    const mic = r.localParticipant.getTrackPublication(Track.Source.Microphone);
    const cam = r.localParticipant.getTrackPublication(Track.Source.Camera);
    const scr = r.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    setLocalMicOn(!!(mic?.track && !mic.track.isMuted));
    setLocalCamOn(!!(cam?.track && !cam.track.isMuted));
    setLocalScreenOn(!!(scr?.track && !scr.track.isMuted));
  }, []);

  const attachLocalCamera = useCallback((r: Room) => {
    const el = localVideoRef.current;
    if (!el) return;
    const pub = r.localParticipant.getTrackPublication(Track.Source.Camera);
    const t = pub?.track;
    if (t && t.kind === Track.Kind.Video) {
      t.detach();
      t.attach(el);
    } else {
      el.srcObject = null;
    }
  }, []);

  const attachScreenToMain = useCallback((track: RemoteTrack | LocalVideoTrack) => {
    const el = screenShareRef.current;
    if (!el) return;
    track.detach();
    track.attach(el);
    void el.play().catch(() => {});
  }, []);

  const detachScreenMain = useCallback(() => {
    const el = screenShareRef.current;
    if (!el) return;
    el.srcObject = null;
  }, []);

  const reattachActiveScreenShare = useCallback(
    (r: Room) => {
      const localPub = r.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      const localTrack = localPub?.track;
      if (localTrack && localTrack.kind === Track.Kind.Video && !localTrack.isMuted) {
        attachScreenToMain(localTrack as LocalVideoTrack);
        return;
      }
      for (const p of r.remoteParticipants.values()) {
        const pub = screenPublicationOn(p);
        const track = pub?.track;
        if (track && track.kind === Track.Kind.Video && !track.isMuted) {
          attachScreenToMain(track as RemoteTrack);
          return;
        }
      }
    },
    [attachScreenToMain],
  );

  const attachRemoteAudio = useCallback(async (track: RemoteAudioTrack) => {
    const el = remoteAudioRef.current;
    if (!el) return;
    track.detach();
    track.attach(el);
    el.volume = 1;
    try {
      await el.play();
    } catch {
      // Autoplay may require a user gesture
    }
  }, []);

  const attachRemoteCamera = useCallback((track: RemoteTrack) => {
    const el = remoteCameraRef.current;
    if (!el || track.kind !== Track.Kind.Video) return;
    track.detach();
    track.attach(el);
    void el.play().catch(() => {});
  }, []);

  const handleRemoteTrack = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (publication.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video) {
        attachScreenToMain(track);
        bumpRemote(participant);
        return;
      }
      if (publication.source === Track.Source.Camera && track.kind === Track.Kind.Video) {
        attachRemoteCamera(track);
        bumpRemote(participant);
        return;
      }
      if (publication.source === Track.Source.Microphone && track.kind === Track.Kind.Audio) {
        void attachRemoteAudio(track as RemoteAudioTrack);
        bumpRemote(participant);
      }
    },
    [attachRemoteAudio, attachRemoteCamera, attachScreenToMain, bumpRemote],
  );

  const handleRemoteTrackUnsubscribed = useCallback(
    (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      track.detach();
      if (publication.source === Track.Source.ScreenShare) {
        detachScreenMain();
      }
      bumpRemote(participant);
    },
    [bumpRemote, detachScreenMain],
  );

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

      const r = new Room({ adaptiveStream: true, dynacast: true });
      joinedRoom = r;
      roomRef.current = r;

      r.on(RoomEvent.Connected, () => {
        setConnected(true);
        r.remoteParticipants.forEach((p) => {
          bumpRemote(p);
          p.trackPublications.forEach((pub) => {
            if (pub.track) {
              handleRemoteTrack(pub.track as RemoteTrack, pub as RemoteTrackPublication, p);
            }
          });
        });
      });
      r.on(RoomEvent.Disconnected, () => {
        setConnected(false);
        bumpRemote(null);
      });

      r.on(RoomEvent.ParticipantConnected, (p) => {
        bumpRemote(p);
        p.trackPublications.forEach((pub) => {
          if (pub.track) {
            handleRemoteTrack(pub.track as RemoteTrack, pub as RemoteTrackPublication, p);
          }
        });
      });
      r.on(RoomEvent.ParticipantDisconnected, () => {
        bumpRemote(null);
        detachScreenMain();
      });

      r.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (!isRemoteParticipant(participant)) return;
        handleRemoteTrack(track as RemoteTrack, publication as RemoteTrackPublication, participant);
      });
      r.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (!isRemoteParticipant(participant)) return;
        handleRemoteTrackUnsubscribed(
          track as RemoteTrack,
          publication as RemoteTrackPublication,
          participant,
        );
      });

      r.on(RoomEvent.TrackMuted, (_publication, participant) => {
        if (participant.isLocal) bumpLocal(r);
        else if (isRemoteParticipant(participant)) bumpRemote(participant);
      });
      r.on(RoomEvent.TrackUnmuted, (_publication, participant) => {
        if (participant.isLocal) bumpLocal(r);
        else if (isRemoteParticipant(participant)) bumpRemote(participant);
      });

      r.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
        const track = publication.track;
        if (!track) return;
        if (publication.source === Track.Source.Camera && localVideoRef.current) {
          track.detach();
          track.attach(localVideoRef.current);
        }
        if (publication.source === Track.Source.ScreenShare && track.kind === Track.Kind.Video) {
          attachScreenToMain(track as LocalVideoTrack);
        }
        bumpLocal(r);
      });
      r.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.source === Track.Source.ScreenShare) {
          publication.track?.detach();
          detachScreenMain();
        }
        bumpLocal(r);
      });

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

      await r.connect(tokenJson.wsUrl, tokenJson.token);
      await r.startAudio().catch(() => {});
      await r.localParticipant.enableCameraAndMicrophone();
      attachLocalCamera(r);
      bumpLocal(r);

      await fetch("/api/meeting/session/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      if (!active) return;
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
      roomRef.current = null;
      bumpRemote(null);
    };
  }, [
    attachLocalCamera,
    attachScreenToMain,
    bookingId,
    bumpLocal,
    bumpRemote,
    detachScreenMain,
    handleRemoteTrack,
    handleRemoteTrackUnsubscribed,
    router,
  ]);

  useEffect(() => {
    if (!connected || !room) return;
    const livekitRoom = room;
    let cancelled = false;
    let fallbackMic: LocalAudioTrack | null = null;

    async function startChunkTranscription() {
      try {
        const deadline = Date.now() + 5000;
        let mediaTrack: MediaStreamTrack | undefined;
        while (Date.now() < deadline && !cancelled) {
          mediaTrack =
            livekitRoom.localParticipant.getTrackPublication(Track.Source.Microphone)?.track
              ?.mediaStreamTrack;
          if (mediaTrack && mediaTrack.readyState === "live") break;
          await new Promise((res) => setTimeout(res, 100));
        }

        if (!mediaTrack || mediaTrack.readyState !== "live") {
          fallbackMic = await createLocalAudioTrack();
          if (cancelled) {
            fallbackMic.stop();
            fallbackMic = null;
            return;
          }
          mediaTrack = fallbackMic.mediaStreamTrack;
        }

        if (cancelled || !mediaTrack) {
          fallbackMic?.stop();
          fallbackMic = null;
          return;
        }
        const stream = new MediaStream([mediaTrack]);
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
          form.append(
            "audio",
            new File([e.data], `meeting-chunk-${idx}.webm`, { type: e.data.type || "audio/webm" }),
          );
          void fetch("/api/meeting/transcribe-chunk", {
            method: "POST",
            body: form,
          });
        };
        recorder.start(15_000);
      } catch {
        fallbackMic?.stop();
        fallbackMic = null;
      }
    }
    void startChunkTranscription();
    return () => {
      cancelled = true;
      fallbackMic?.stop();
      fallbackMic = null;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      recorderStreamRef.current?.getTracks().forEach((t) => t.stop());
      recorderStreamRef.current = null;
    };
  }, [bookingId, connected, room]);

  const canEndSession = role === "coach";
  const anyScreenShare = localScreenOn || remoteScreenOn;

  useEffect(() => {
    if (!anyScreenShare || !roomRef.current) return;
    reattachActiveScreenShare(roomRef.current);
  }, [anyScreenShare, reattachActiveScreenShare]);

  async function toggleMute() {
    const r = roomRef.current;
    if (!r) return;
    await r.localParticipant.setMicrophoneEnabled(!localMicOn);
    bumpLocal(r);
  }

  async function toggleCamera() {
    const r = roomRef.current;
    if (!r) return;
    await r.localParticipant.setCameraEnabled(!localCamOn);
    attachLocalCamera(r);
    bumpLocal(r);
  }

  async function toggleScreenShare() {
    const r = roomRef.current;
    if (!r) return;
    if (localScreenOn) {
      await r.localParticipant.setScreenShareEnabled(false);
      detachScreenMain();
      bumpLocal(r);
      return;
    }
    await r.localParticipant.setScreenShareEnabled(true);
    const pub = r.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    const t = pub?.track;
    if (t && t.kind === Track.Kind.Video) {
      attachScreenToMain(t as LocalVideoTrack);
    }
    bumpLocal(r);
  }

  async function sendChat() {
    const r = roomRef.current;
    if (!r || !chatText.trim()) return;
    const text = chatText.trim();
    await r.localParticipant.publishData(new TextEncoder().encode(text), { reliable: true });
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
    const r = roomRef.current;
    if (r) await r.disconnect();
    router.push(role === "coach" ? "/coach/sessions" : "/dashboard/coach-bookings");
  }

  const statusLabel = error ? error : connected ? "Connected" : "Connecting…";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#202124] text-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 md:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white/90">Coaching session</p>
          <p className="truncate text-xs text-white/50">{statusLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {localScreenOn ? (
            <span className="hidden rounded-full bg-[#1e3a1e] px-3 py-1 text-xs font-medium text-[#ceead6] sm:inline">
              You’re presenting
            </span>
          ) : null}
          <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/80 sm:inline">
            {role === "coach" ? "Coach" : "Candidate"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-black">
          <video
            ref={screenShareRef}
            autoPlay
            playsInline
            className={`absolute inset-0 z-0 size-full bg-black object-contain ${
              anyScreenShare ? "" : "pointer-events-none opacity-0"
            }`}
          />

          <video
            ref={remoteCameraRef}
            autoPlay
            playsInline
            className={
              anyScreenShare
                ? "absolute bottom-[14.5rem] right-4 z-10 aspect-video w-[min(30%,240px)] overflow-hidden rounded-lg border-2 border-white/20 bg-black object-cover shadow-xl md:right-8"
                : "absolute inset-0 z-0 size-full bg-[#171717] object-cover"
            }
          />

          <audio ref={remoteAudioRef} autoPlay className="hidden" />

          {!remoteParticipant ? (
            <div className="absolute inset-0 z-[5] flex flex-col items-center justify-center gap-2 bg-[#171717] text-white/55">
              <Users className="size-12 opacity-35" aria-hidden />
              <p className="text-sm">Waiting for others to join…</p>
            </div>
          ) : null}

          {!anyScreenShare && !remoteCamOn && remoteParticipant ? (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#171717]">
              <div className="flex size-28 items-center justify-center rounded-full bg-[#3c4043] text-3xl font-semibold text-white/90">
                {initials(remoteLabel)}
              </div>
              <p className="text-sm text-white/70">Camera is off</p>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 text-white/80">
                {!remoteMicOn ? (
                  <MicOff className="size-5 text-[#ea4335]" aria-hidden />
                ) : (
                  <Mic className="size-5 text-white/60" aria-hidden />
                )}
                <span className="text-sm">{remoteLabel}</span>
              </div>
            </div>
          ) : null}

          {anyScreenShare && !remoteCamOn && remoteParticipant ? (
            <div className="absolute bottom-[14.5rem] right-4 z-20 flex aspect-video w-[min(30%,240px)] flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/30 bg-[#2d2f31] md:right-8">
              <VideoOff className="mb-2 size-8 text-white/50" aria-hidden />
              <span className="text-center text-xs text-white/60">Camera off</span>
            </div>
          ) : null}

          <div className="absolute bottom-24 right-4 z-20 aspect-video w-[min(28%,220px)] overflow-hidden rounded-xl border-2 border-white/20 bg-black shadow-2xl md:right-8">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="size-full object-cover"
            />
            {!localCamOn ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2d2f31]">
                <VideoOff className="mb-1 size-7 text-white/50" aria-hidden />
                <span className="text-[10px] text-white/50">You</span>
              </div>
            ) : null}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white/90">
              {localMicOn ? (
                <Mic className="size-3.5 text-white/80" aria-hidden />
              ) : (
                <MicOff className="size-3.5 text-[#f28b82]" aria-hidden />
              )}
              <span>You</span>
            </div>
          </div>

          {remoteParticipant && (anyScreenShare ? remoteCamOn : true) ? (
            <div className="pointer-events-none absolute bottom-28 left-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white/90 md:bottom-32">
              {!remoteMicOn ? (
                <MicOff className="size-4 text-[#f28b82]" aria-hidden />
              ) : (
                <Mic className="size-4 text-white/70" aria-hidden />
              )}
              <span className="max-w-[12rem] truncate">{remoteLabel}</span>
            </div>
          ) : null}
        </div>

        {(chatOpen || peopleOpen) && (
          <aside className="flex w-full max-w-sm shrink-0 flex-col border-l border-white/10 bg-[#2d2f31]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-medium">{chatOpen ? "In-call messages" : "People"}</p>
              <button
                type="button"
                className="rounded-full p-1.5 text-white/70 hover:bg-white/10"
                onClick={() => {
                  setChatOpen(false);
                  setPeopleOpen(false);
                }}
                aria-label="Close panel"
              >
                <X className="size-5" />
              </button>
            </div>
            {chatOpen ? (
              <>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
                  {chatItems.map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg px-3 py-2 text-sm ${
                        msg.mine ? "ml-6 bg-[#004a77] text-white" : "mr-6 bg-[#3c4043] text-white/90"
                      }`}
                    >
                      <p className="text-[11px] font-medium text-white/60">{msg.sender}</p>
                      <p className="mt-0.5 whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-white/10 p-3">
                  <div className="flex gap-2">
                    <input
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void sendChat();
                      }}
                      placeholder="Send a message"
                      className="h-10 flex-1 rounded-lg border border-white/10 bg-[#202124] px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-[#8ab4f8]"
                    />
                    <button
                      type="button"
                      onClick={() => void sendChat()}
                      className="rounded-lg bg-[#8ab4f8] px-4 text-sm font-medium text-[#202124] hover:bg-[#aecbfa]"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2 p-4 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-[#3c4043] px-3 py-2">
                  <span className="text-white/90">You</span>
                  <span className="flex items-center gap-1 text-white/60">
                    {localMicOn ? <Mic className="size-4" /> : <MicOff className="size-4 text-[#f28b82]" />}
                    {localCamOn ? <Video className="size-4" /> : <VideoOff className="size-4 text-[#f28b82]" />}
                  </span>
                </div>
                {remoteParticipant ? (
                  <div className="flex items-center justify-between rounded-lg bg-[#3c4043] px-3 py-2">
                    <span className="truncate text-white/90">{remoteLabel}</span>
                    <span className="flex shrink-0 items-center gap-1 text-white/60">
                      {remoteMicOn ? <Mic className="size-4" /> : <MicOff className="size-4 text-[#f28b82]" />}
                      {remoteCamOn ? <Video className="size-4" /> : <VideoOff className="size-4 text-[#f28b82]" />}
                    </span>
                  </div>
                ) : (
                  <p className="text-white/50">Waiting for others to join…</p>
                )}
              </div>
            )}
          </aside>
        )}
      </div>

      <footer className="flex shrink-0 flex-col items-center gap-3 border-t border-white/10 bg-[#202124] px-4 py-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-2 rounded-full bg-[#3c4043] px-2 py-2 pr-3 shadow-lg">
            <MeetControl
              active={localMicOn}
              label={localMicOn ? "Turn microphone off" : "Turn microphone on"}
              onClick={() => void toggleMute()}
            >
              {localMicOn ? <Mic className="size-6" /> : <MicOff className="size-6" />}
            </MeetControl>
            <MeetControl
              active={localCamOn}
              label={localCamOn ? "Turn camera off" : "Turn camera on"}
              onClick={() => void toggleCamera()}
            >
              {localCamOn ? <Video className="size-6" /> : <VideoOff className="size-6" />}
            </MeetControl>
            <MeetControl
              active
              presenting={localScreenOn}
              label={localScreenOn ? "Stop presenting" : "Present now"}
              onClick={() => void toggleScreenShare()}
            >
              <MonitorUp className="size-6" />
            </MeetControl>
            <div className="relative">
              <MeetControl
                active
                label="More options"
                onClick={() => {
                  setToolsOpen((o) => !o);
                }}
              >
                <MoreVertical className="size-6" />
              </MeetControl>
              {toolsOpen ? (
                <div className="absolute bottom-14 left-1/2 z-30 w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-[#2d2f31] py-1 shadow-xl">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/10"
                    onClick={() => {
                      setPeopleOpen(true);
                      setChatOpen(false);
                      setToolsOpen(false);
                    }}
                  >
                    <Users className="size-4" /> People
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/10"
                    onClick={() => {
                      setChatOpen(true);
                      setPeopleOpen(false);
                      setToolsOpen(false);
                    }}
                  >
                    <MessageSquare className="size-4" /> Chat
                  </button>
                </div>
              ) : null}
            </div>
            <MeetControl
              danger
              active={false}
              label={canEndSession ? "Leave or end call" : "Leave call"}
              onClick={() => void leaveMeeting(false)}
            >
              <PhoneOff className="size-6" />
            </MeetControl>
          </div>
          {canEndSession ? (
            <button
              type="button"
              onClick={() => void leaveMeeting(true)}
              className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 hover:bg-white/10"
            >
              End for everyone
            </button>
          ) : null}
        </div>
      </footer>

      {toolsOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 cursor-default bg-transparent"
          aria-label="Dismiss menu"
          onClick={() => setToolsOpen(false)}
        />
      ) : null}
    </div>
  );
}
