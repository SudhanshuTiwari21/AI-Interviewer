"use client";

import { useState } from "react";
import { Mic } from "lucide-react";

type Props = {
  speaking?: boolean;
  mood?: "balanced" | "friendly" | "bar-raiser";
  className?: string;
};

const moodAccent: Record<NonNullable<Props["mood"]>, string> = {
  balanced: "from-slate-400/30 via-slate-500/20 to-slate-700/30",
  friendly: "from-emerald-300/30 via-teal-400/20 to-emerald-600/30",
  "bar-raiser": "from-rose-300/30 via-rose-500/20 to-rose-700/30",
};

const moodRing: Record<NonNullable<Props["mood"]>, string> = {
  balanced: "ring-slate-300/70",
  friendly: "ring-emerald-300/70",
  "bar-raiser": "ring-rose-300/70",
};

/**
 * Professional female interviewer avatar.
 * Uses a photoreal studio portrait with subtle idle breathing + a
 * visible "speaking" state (pulse ring, breathing, soundwave).
 */
export function InterviewerAvatar({
  speaking,
  mood = "balanced",
  className,
}: Props) {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-slate-200 ${
        className ?? ""
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${moodAccent[mood]} opacity-80`}
        aria-hidden
      />

      <div className="relative flex h-full w-full items-end justify-center">
        <div
          className={`relative h-full w-full ${
            speaking ? "animate-breathe-fast" : "animate-breathe"
          }`}
        >
          {imgOk ? (
            <img
              src="/avatars/interviewer-female.png"
              alt="Professional interviewer"
              className="h-full w-full object-cover object-top"
              onError={() => setImgOk(false)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-200 to-slate-300">
              <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700">
                Ava Reynolds
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-center`}
        aria-hidden
      >
        <div
          className={`flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 shadow-sm backdrop-blur ring-1 ${
            moodRing[mood]
          } ${speaking ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
        >
          <Mic className="h-3.5 w-3.5 text-slate-700" />
          <div className="flex items-end gap-[2px]">
            <span className="block h-2 w-[3px] origin-bottom rounded-sm bg-slate-700 animate-wave-1" />
            <span className="block h-3 w-[3px] origin-bottom rounded-sm bg-slate-700 animate-wave-2" />
            <span className="block h-4 w-[3px] origin-bottom rounded-sm bg-slate-700 animate-wave-3" />
            <span className="block h-3 w-[3px] origin-bottom rounded-sm bg-slate-700 animate-wave-2" />
            <span className="block h-2 w-[3px] origin-bottom rounded-sm bg-slate-700 animate-wave-1" />
          </div>
        </div>
      </div>

      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl ring-2 transition-all duration-500 ${
          speaking
            ? `${moodRing[mood]} ring-offset-0 animate-glow`
            : "ring-transparent"
        }`}
        aria-hidden
      />
    </div>
  );
}

export default InterviewerAvatar;
