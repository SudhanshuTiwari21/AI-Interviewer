"use client";

/**
 * Tiny client-side persistence layer. The MVP stores everything in
 * localStorage so the full flow (sign up → checkout → interview → report
 * → schedule) works end-to-end without a backend.
 */

import type { InterviewConfig, InterviewReport } from "./question-engine";
import type { Plan } from "./mock-data";
import { DEFAULT_COACHES, type Coach } from "./coaches";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan?: Plan["id"] | "free";
  role?: "user" | "sub_admin" | "admin" | "super_admin";
};

const KEYS = {
  user: "hiro.user",
  reports: "hiro.reports",
  config: "hiro.config",
  bookings: "hiro.bookings",
  coaches: "hiro.coaches",
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (globalThis.window === undefined) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  if (globalThis.window === undefined) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization issue - ignore for MVP */
  }
}

function normalizeCoach(raw: Coach): Coach {
  return {
    ...raw,
    email: raw.email ?? `${raw.id}@selectwise.app`,
    techAreas:
      raw.techAreas && raw.techAreas.length > 0 ? raw.techAreas : raw.focus ?? [],
    hourlyRateInr: raw.hourlyRateInr ?? 999,
  };
}

export const store = {
  getUser(): User | null {
    return safeGet<User | null>(KEYS.user, null);
  },
  setUser(user: User | null) {
    if (user) safeSet(KEYS.user, user);
    else if (globalThis.window !== undefined)
      localStorage.removeItem(KEYS.user);
  },
  getReports(): InterviewReport[] {
    return safeGet<InterviewReport[]>(KEYS.reports, []);
  },
  saveReport(report: InterviewReport) {
    const all = store.getReports();
    safeSet(KEYS.reports, [report, ...all].slice(0, 30));
  },
  getReport(id: string): InterviewReport | undefined {
    return store.getReports().find((r) => r.id === id);
  },
  setConfig(config: InterviewConfig) {
    safeSet(KEYS.config, config);
  },
  getConfig(): InterviewConfig | null {
    return safeGet<InterviewConfig | null>(KEYS.config, null);
  },
  getBookings(): Booking[] {
    return safeGet<Booking[]>(KEYS.bookings, []);
  },
  saveBooking(b: Booking) {
    const all = store.getBookings();
    safeSet(KEYS.bookings, [b, ...all]);
  },
  deleteBooking(id: string) {
    const all = store.getBookings();
    safeSet(
      KEYS.bookings,
      all.filter((b) => b.id !== id),
    );
  },
  getCoaches(): Coach[] {
    const saved = safeGet<Coach[] | null>(KEYS.coaches, null);
    if (!saved || saved.length === 0) {
      safeSet(KEYS.coaches, DEFAULT_COACHES);
      return DEFAULT_COACHES;
    }
    const normalized = saved.map((c) => normalizeCoach(c));
    safeSet(KEYS.coaches, normalized);
    return normalized;
  },
  setCoaches(coaches: Coach[]) {
    safeSet(KEYS.coaches, coaches);
  },
  upsertCoach(coach: Coach) {
    const all = store.getCoaches();
    const idx = all.findIndex((c) => c.id === coach.id);
    if (idx === -1) {
      safeSet(KEYS.coaches, [coach, ...all]);
      return;
    }
    const next = [...all];
    next[idx] = coach;
    safeSet(KEYS.coaches, next);
  },
  deleteCoach(id: string) {
    const all = store.getCoaches();
    safeSet(
      KEYS.coaches,
      all.filter((c) => c.id !== id),
    );
  },
};

export type Booking = {
  id: string;
  coachName: string;
  topic: string;
  startsAt: string;
  durationMin: number;
  meetingUrl: string;
  calendarProvider: "google" | "outlook" | "ical";
};
