export type AvailabilityWindow = {
  startMinute: number; // 0-1439
  endMinute: number; // 1-1440
};

export type CoachAvailability = {
  weekdays: number[]; // 0-6 (Sun-Sat)
  /** Default time windows for any selected weekday without a `dayWindows` override. */
  windows: AvailabilityWindow[];
  /** Slot grid step in minutes (e.g. 30 or 60). Defaults to 30. */
  slotStepMin?: number;
  /**
   * Optional per-weekday windows (0 = Sun … 6 = Sat). When set for a day, replaces `windows`
   * for that day only.
   */
  dayWindows?: Partial<Record<number, AvailabilityWindow[]>>;
};

export type Coach = {
  id: string;
  name: string;
  email: string;
  title: string;
  description: string;
  rating: number;
  reviewCount?: number;
  sessions: number;
  recentFeedbacks?: Array<{
    rating: number;
    feedbackText: string;
    candidateName: string;
    createdAt: string;
  }>;
  focus: string[];
  techAreas: string[];
  perSessionRateInr: number;
  active: boolean;
  timezone: string;
  availability: CoachAvailability;
};

function dayWindowsForDay(
  dayWindows: Coach["availability"]["dayWindows"],
  day: number,
): AvailabilityWindow[] | undefined {
  if (!dayWindows) return undefined;
  const direct = dayWindows[day];
  if (direct && direct.length > 0) return direct;
  const keyed = dayWindows as Record<string, AvailabilityWindow[] | undefined>;
  const fromKey = keyed[String(day)];
  if (fromKey && fromKey.length > 0) return fromKey;
  return undefined;
}

function windowsForDay(coach: Coach, day: number): AvailabilityWindow[] {
  const override = dayWindowsForDay(coach.availability.dayWindows, day);
  if (override) return override;
  const base = coach.availability.windows ?? [];
  if (base.length > 0) return base;
  return [{ startMinute: 9 * 60, endMinute: 18 * 60 }];
}

/** True when this calendar day has configured availability for the coach. */
export function isCoachAvailableOnDay(coach: Coach, date: Date): boolean {
  if (!coach.active) return false;
  return coach.availability.weekdays.includes(date.getDay());
}

export function buildSlotsForCoach(coach: Coach, date: Date): string[] {
  if (!coach.active) return [];
  const day = date.getDay();
  if (!coach.availability.weekdays.includes(day)) return [];

  const slots: string[] = [];
  const windows = windowsForDay(coach, day);
  const slotStepMin = Math.min(
    180,
    Math.max(15, Math.round(coach.availability.slotStepMin ?? 30)),
  );
  for (const window of windows) {
    for (
      let totalMinutes = window.startMinute;
      totalMinutes + slotStepMin <= window.endMinute;
      totalMinutes += slotStepMin
    ) {
      const slot = new Date(date);
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      slot.setHours(hour, minute, 0, 0);
      slots.push(slot.toISOString());
    }
  }
  return slots;
}
