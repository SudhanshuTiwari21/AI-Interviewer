export type CoachAvailability = {
  weekdays: number[]; // 0-6 (Sun-Sat)
  startHour: number; // 0-23
  endHour: number; // 1-24
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

export const DEFAULT_COACHES: Coach[] = [
  {
    id: "coach-1",
    name: "Diana Park",
    email: "diana.park@selectwise.app",
    title: "Ex-Stripe, Senior Eng Manager",
    rating: 4.9,
    sessions: 312,
    focus: ["System design", "Frontend", "Career"],
    techAreas: ["Frontend", "Scrum Master", "System Design"],
    hourlyRateInr: 1499,
    active: true,
    timezone: "Asia/Kolkata",
    availability: { weekdays: [1, 2, 3, 4, 5], startHour: 9, endHour: 18, intervalMin: 30 },
  },
  {
    id: "coach-2",
    name: "Marcus Lee",
    email: "marcus.lee@selectwise.app",
    title: "Ex-Meta, Staff Engineer",
    rating: 4.8,
    sessions: 248,
    focus: ["Backend", "System design", "Behavioral"],
    techAreas: ["Java Senior Developer", "Backend", "System Design"],
    hourlyRateInr: 1999,
    active: true,
    timezone: "Asia/Kolkata",
    availability: { weekdays: [1, 2, 4, 5], startHour: 10, endHour: 19, intervalMin: 30 },
  },
  {
    id: "coach-3",
    name: "Sara Okonkwo",
    email: "sara.okonkwo@selectwise.app",
    title: "Ex-Notion, Group PM",
    rating: 4.95,
    sessions: 401,
    focus: ["Product sense", "Leadership", "Storytelling"],
    techAreas: ["Product Management", "Scrum Master", "Leadership"],
    hourlyRateInr: 999,
    active: true,
    timezone: "Asia/Kolkata",
    availability: { weekdays: [1, 3, 5], startHour: 9, endHour: 17, intervalMin: 60 },
  },
];

export function buildSlotsForCoach(coach: Coach, date: Date): string[] {
  if (!coach.active) return [];
  if (!coach.availability.weekdays.includes(date.getDay())) return [];

  const slots: string[] = [];
  const { startHour, endHour, intervalMin } = coach.availability;
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMin) {
      const slot = new Date(date);
      slot.setHours(hour, minute, 0, 0);
      if (slot.getHours() >= endHour) continue;
      slots.push(slot.toISOString());
    }
  }
  return slots;
}
