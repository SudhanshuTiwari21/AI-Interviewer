export type Role =
  | "Frontend Engineer"
  | "Backend Engineer"
  | "Full-Stack Engineer"
  | "Product Manager"
  | "Data Scientist"
  | "Designer";

export type Level = "Junior" | "Mid" | "Senior" | "Staff";

export const ROLES: Role[] = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-Stack Engineer",
  "Product Manager",
  "Data Scientist",
  "Designer",
];

export const LEVELS: Level[] = ["Junior", "Mid", "Senior", "Staff"];

export const FOCUS_AREAS = [
  "System design",
  "Behavioural",
  "Coding fundamentals",
  "Product sense",
  "Leadership",
  "Communication",
  "Domain knowledge",
];

export type ScriptedQuestion = {
  id: string;
  text: string;
  category: "intro" | "behavioral" | "technical" | "wrap";
  expectedDurationSec: number;
  hints?: string[];
};

export const SCRIPTED_INTRO: ScriptedQuestion[] = [
  {
    id: "q-intro-1",
    text: "Walk me through your background and what brought you to this role.",
    category: "intro",
    expectedDurationSec: 90,
    hints: ["Keep it under 90 seconds", "Tie experience to the role"],
  },
];

export const SCRIPTED_TECHNICAL: Record<Role, ScriptedQuestion[]> = {
  "Frontend Engineer": [
    {
      id: "fe-1",
      text: "How would you architect a design system that scales across 5 product teams?",
      category: "technical",
      expectedDurationSec: 180,
    },
    {
      id: "fe-2",
      text: "Describe a time you measurably improved web performance. What did you change and what was the impact?",
      category: "technical",
      expectedDurationSec: 180,
    },
  ],
  "Backend Engineer": [
    {
      id: "be-1",
      text: "Design an idempotent API for processing payments. How do you handle retries and partial failures?",
      category: "technical",
      expectedDurationSec: 240,
    },
    {
      id: "be-2",
      text: "Walk me through how you would scale a write-heavy service from 1k to 100k QPS.",
      category: "technical",
      expectedDurationSec: 240,
    },
  ],
  "Full-Stack Engineer": [
    {
      id: "fs-1",
      text: "Take us through how you would design a real-time collaborative document editor end-to-end.",
      category: "technical",
      expectedDurationSec: 240,
    },
    {
      id: "fs-2",
      text: "How do you decide when to push logic to the client vs. keep it on the server?",
      category: "technical",
      expectedDurationSec: 180,
    },
  ],
  "Product Manager": [
    {
      id: "pm-1",
      text: "How would you design a feature to help new users find value in their first session?",
      category: "technical",
      expectedDurationSec: 240,
    },
    {
      id: "pm-2",
      text: "Tell me about a product decision you made that turned out to be wrong. What did you learn?",
      category: "technical",
      expectedDurationSec: 180,
    },
  ],
  "Data Scientist": [
    {
      id: "ds-1",
      text: "How would you measure the success of a recommendation system in a marketplace?",
      category: "technical",
      expectedDurationSec: 240,
    },
    {
      id: "ds-2",
      text: "Explain how you would diagnose a sudden 20% drop in model accuracy in production.",
      category: "technical",
      expectedDurationSec: 240,
    },
  ],
  Designer: [
    {
      id: "de-1",
      text: "Walk me through a recent project - focus on the problem, your process, and the trade-offs.",
      category: "technical",
      expectedDurationSec: 240,
    },
    {
      id: "de-2",
      text: "How do you partner with engineers when scope or timelines change mid-project?",
      category: "technical",
      expectedDurationSec: 180,
    },
  ],
};

export const SCRIPTED_BEHAVIORAL: ScriptedQuestion[] = [
  {
    id: "bh-1",
    text: "Tell me about a time you disagreed with a teammate. How did you resolve it?",
    category: "behavioral",
    expectedDurationSec: 180,
  },
  {
    id: "bh-2",
    text: "Describe the most ambiguous problem you've owned. How did you create clarity?",
    category: "behavioral",
    expectedDurationSec: 180,
  },
];

export const SCRIPTED_WRAP: ScriptedQuestion[] = [
  {
    id: "wrap-1",
    text: "What questions do you have for us?",
    category: "wrap",
    expectedDurationSec: 90,
  },
];

export type Plan = {
  id: "starter" | "pro" | "team";
  name: string;
  price: number;
  cadence: "one-time" | "monthly";
  highlight?: boolean;
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 29,
    cadence: "one-time",
    features: [
      "1 full mock interview",
      "Voice + text answers",
      "Instant scored report",
      "Email delivery",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 79,
    cadence: "one-time",
    highlight: true,
    features: [
      "3 mock interviews",
      "Adaptive AI question engine",
      "PDF feedback report",
      "1× human coaching session",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: 199,
    cadence: "monthly",
    features: [
      "Unlimited mock interviews",
      "Custom rubric + role library",
      "Team analytics dashboard",
      "Priority human coaching",
    ],
  },
];

export type SessionRecord = {
  id: string;
  role: Role;
  level: Level;
  candidate: string;
  status: "completed" | "in-progress" | "scheduled";
  score: number;
  durationMin: number;
  startedAt: string;
};

export const RECENT_SESSIONS: SessionRecord[] = [
  {
    id: "ses_001",
    role: "Frontend Engineer",
    level: "Senior",
    candidate: "Priya Sharma",
    status: "completed",
    score: 86,
    durationMin: 42,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
  },
  {
    id: "ses_002",
    role: "Product Manager",
    level: "Mid",
    candidate: "Marcus Chen",
    status: "completed",
    score: 73,
    durationMin: 38,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: "ses_003",
    role: "Backend Engineer",
    level: "Staff",
    candidate: "Aisha Patel",
    status: "completed",
    score: 91,
    durationMin: 51,
    startedAt: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
  },
  {
    id: "ses_004",
    role: "Data Scientist",
    level: "Senior",
    candidate: "Diego Alvarez",
    status: "in-progress",
    score: 0,
    durationMin: 12,
    startedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
];
