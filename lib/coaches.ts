export type CoachAvailability = {
  weekdays: number[]; // 0-6 (Sun-Sat)
  windows: Array<{
    startMinute: number; // 0-1439
    endMinute: number; // 1-1440
  }>;
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

export function buildSlotsForCoach(coach: Coach, date: Date): string[] {
  if (!coach.active) return [];
  if (!coach.availability.weekdays.includes(date.getDay())) return [];

  const slots: string[] = [];
  const { windows } = coach.availability;
  const slotStepMin = 30;
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
