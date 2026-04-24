"use client";

/**
 * Tiny client-side persistence layer. The MVP stores everything in
 * localStorage so the full flow (sign up → checkout → interview → report
 * → schedule) works end-to-end without a backend.
 */

import type { InterviewConfig, InterviewReport } from "./question-engine";
import type { Plan } from "./mock-data";

export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan?: Plan["id"] | "free";
};

const KEYS = {
  user: "apex.user",
  reports: "apex.reports",
  config: "apex.config",
  bookings: "apex.bookings",
} as const;

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota or serialization issue - ignore for MVP */
  }
}

export const store = {
  getUser(): User | null {
    return safeGet<User | null>(KEYS.user, null);
  },
  setUser(user: User | null) {
    if (user) safeSet(KEYS.user, user);
    else if (typeof window !== "undefined") localStorage.removeItem(KEYS.user);
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
