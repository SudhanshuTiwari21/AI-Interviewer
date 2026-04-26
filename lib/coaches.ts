export type CoachAvailability = {
  weekdays: number[]; // 0-6 (Sun-Sat)
  windows: Array<{
    startHour: number; // 0-23
    endHour: number; // 1-24
  }>;
  intervalMin: 15 | 30 | 60;
};

export type Coach = {
  id: string;
  name: string;
  email: string;
  title: string;
  rating: number;
  sessions: number;
  focus: string[];
  techAreas: string[];
  hourlyRateInr: number;
  active: boolean;
  timezone: string;
  availability: CoachAvailability;
};

export function buildSlotsForCoach(coach: Coach, date: Date): string[] {
  if (!coach.active) return [];
  if (!coach.availability.weekdays.includes(date.getDay())) return [];

  const slots: string[] = [];
  const { windows, intervalMin } = coach.availability;
  for (const window of windows) {
    for (let hour = window.startHour; hour < window.endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMin) {
        const slot = new Date(date);
        slot.setHours(hour, minute, 0, 0);
        const totalMinutes = slot.getHours() * 60 + slot.getMinutes();
        if (totalMinutes >= window.endHour * 60) continue;
        slots.push(slot.toISOString());
      }
    }
  }
  return slots;
}
