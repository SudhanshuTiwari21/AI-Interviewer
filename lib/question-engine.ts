import {
  SCRIPTED_INTRO,
  SCRIPTED_TECHNICAL,
  SCRIPTED_BEHAVIORAL,
  SCRIPTED_WRAP,
  type Role,
  type Level,
  type ScriptedQuestion,
} from "./mock-data";
import { getOpenAIClient } from "./openai-client";
import { uid } from "./utils";

export type QuestionSource = "scripted" | "ai-generated";

export type InterviewQuestion = {
  id: string;
  index: number;
  text: string;
  category: ScriptedQuestion["category"] | "follow-up";
  source: QuestionSource;
  expectedDurationSec: number;
  rationale?: string;
};

export type InterviewConfig = {
  role: Role;
  level: Level;
  focusAreas: string[];
  totalQuestions: number;
};

/**
 * Build the initial scripted plan for an interview. The engine will
 * interleave AI-generated follow-ups based on candidate responses.
 */
export function buildInterviewPlan(
  config: InterviewConfig,
): InterviewQuestion[] {
  const technical = SCRIPTED_TECHNICAL[config.role] ?? [];
  const ordered: ScriptedQuestion[] = [
    ...SCRIPTED_INTRO,
    ...SCRIPTED_BEHAVIORAL.slice(0, 1),
    ...technical.slice(0, 2),
    ...SCRIPTED_BEHAVIORAL.slice(1, 2),
    ...SCRIPTED_WRAP,
  ];

  return ordered.slice(0, config.totalQuestions).map((q, i) => ({
    id: q.id,
    index: i,
    text: q.text,
    category: q.category,
    source: "scripted",
    expectedDurationSec: q.expectedDurationSec,
  }));
}

const FOLLOW_UP_TEMPLATES = [
  "You mentioned {keyword} — can you walk me through the trade-offs you considered there?",
  "Interesting. What would you do differently next time, especially around {keyword}?",
  "Let's go deeper on {keyword}. How did you measure success?",
  "Could you give a concrete example of how {keyword} played out with stakeholders?",
  "If we removed {keyword} from the picture, how would your approach change?",
];

const FALLBACK_FOLLOW_UPS = [
  "What was the single biggest constraint, and how did it shape your decisions?",
  "How would you adapt this approach for a team twice the size?",
  "What's a signal that would tell you this approach is no longer the right one?",
];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "have",
  "were",
  "into",
  "about",
  "their",
  "would",
  "could",
  "should",
  "while",
  "where",
  "which",
  "your",
  "youre",
  "really",
  "think",
  "thing",
  "stuff",
  "kind",
  "like",
  "just",
  "very",
]);

function extractKeyword(answer: string): string | null {
  const words = answer
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOPWORDS.has(w));
  if (!words.length) return null;
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

/**
 * Decide whether to interleave an AI follow-up based on the answer length
 * and sequence position. Returns null if no follow-up should be inserted.
 *
 * In production this would hit OpenAI; for the MVP we synthesize a contextual
 * follow-up locally so the UX is fully demoable without an API key.
 */
export function maybeGenerateFollowUp(
  config: InterviewConfig,
  previousQuestion: InterviewQuestion,
  answer: string,
  alreadyInserted: number,
): InterviewQuestion | null {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  // Skip follow-ups for the wrap-up question or if answer is too short.
  if (previousQuestion.category === "wrap") return null;
  if (wordCount < 12) return null;
  // Limit to two AI follow-ups per session for pacing.
  if (alreadyInserted >= 2) return null;

  const keyword = extractKeyword(answer);
  const text = keyword
    ? FOLLOW_UP_TEMPLATES[
        Math.floor(Math.random() * FOLLOW_UP_TEMPLATES.length)
      ].replace("{keyword}", keyword)
    : FALLBACK_FOLLOW_UPS[
        Math.floor(Math.random() * FALLBACK_FOLLOW_UPS.length)
      ];

  return {
    id: uid("ai"),
    index: previousQuestion.index + 0.5,
    text,
    category: "follow-up",
    source: "ai-generated",
    expectedDurationSec: 120,
    rationale: keyword
      ? `Probing on '${keyword}' from previous answer for ${config.level} signal.`
      : `Probing for depth on previous answer.`,
  };
}

export async function maybeGenerateFollowUpWithAI(
  config: InterviewConfig,
  previousQuestion: InterviewQuestion,
  answer: string,
  alreadyInserted: number,
): Promise<InterviewQuestion | null> {
  const fallback = maybeGenerateFollowUp(
    config,
    previousQuestion,
    answer,
    alreadyInserted,
  );
  if (!fallback) return null;

  const client = getOpenAIClient();
  if (!client) return fallback;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        {
          role: "system",
          content:
            "You are a senior interviewer. Generate one concise follow-up interview question only. No preamble, no bullets, no quotes.",
        },
        {
          role: "user",
          content: [
            `Role: ${config.role}`,
            `Level: ${config.level}`,
            `Focus areas: ${config.focusAreas.join(", ") || "general"}`,
            `Previous question: ${previousQuestion.text}`,
            `Candidate answer: ${answer}`,
            "Write one sharp follow-up that probes trade-offs, metrics, ownership, or depth.",
            "Max 35 words.",
          ].join("\n"),
        },
      ],
    });
    const aiText = completion.choices[0]?.message?.content?.trim();
    if (!aiText) return fallback;
    return {
      ...fallback,
      text: aiText.replace(/^["']|["']$/g, ""),
      rationale: "Generated by OpenAI based on candidate response context.",
    };
  } catch {
    return fallback;
  }
}

export type AnswerRecord = {
  questionId: string;
  question: string;
  category: InterviewQuestion["category"];
  source: QuestionSource;
  transcript: string;
  durationSec: number;
  mode: "voice" | "text";
};

export type ScoreBreakdown = {
  communication: number;
  technicalDepth: number;
  problemSolving: number;
  structure: number;
  ownership: number;
};

export type InterviewReport = {
  id: string;
  candidate: string;
  email: string;
  role: Role;
  level: Level;
  overall: number;
  rating: "Strong hire" | "Hire" | "Lean hire" | "No hire";
  durationMin: number;
  generatedAt: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  improvements: string[];
  perQuestion: Array<{
    question: string;
    summary: string;
    score: number;
    source: QuestionSource;
  }>;
  nextSteps: string[];
};

/**
 * Mock scoring. Looks at answer length, keyword density, and structural
 * cues (e.g. STAR-style markers) to produce a deterministic-feeling score.
 */
export function generateReport(
  config: InterviewConfig,
  candidate: { name: string; email: string },
  answers: AnswerRecord[],
): InterviewReport {
  const totalWords = answers.reduce(
    (s, a) => s + a.transcript.trim().split(/\s+/).filter(Boolean).length,
    0,
  );
  const avgWords = totalWords / Math.max(answers.length, 1);

  const structureSignals = [
    "first",
    "next",
    "then",
    "finally",
    "because",
    "trade-off",
    "tradeoff",
    "metric",
    "measured",
    "outcome",
    "impact",
    "result",
  ];
  const structureHits = answers.reduce((s, a) => {
    const t = a.transcript.toLowerCase();
    return (
      s + structureSignals.filter((sig) => t.includes(sig)).length
    );
  }, 0);

  const baseline = 62;
  const communication = clampScore(
    baseline + (avgWords > 80 ? 14 : avgWords > 40 ? 8 : 0) + jitter(),
  );
  const technicalDepth = clampScore(
    baseline + (avgWords > 120 ? 18 : avgWords > 60 ? 10 : 4) + jitter(),
  );
  const problemSolving = clampScore(
    baseline + Math.min(structureHits * 2, 18) + jitter(),
  );
  const structure = clampScore(
    baseline + Math.min(structureHits * 2.5, 22) + jitter(),
  );
  const ownership = clampScore(baseline + (totalWords > 600 ? 16 : 8) + jitter());

  const overall = Math.round(
    (communication + technicalDepth + problemSolving + structure + ownership) /
      5,
  );

  const rating: InterviewReport["rating"] =
    overall >= 85
      ? "Strong hire"
      : overall >= 75
        ? "Hire"
        : overall >= 65
          ? "Lean hire"
          : "No hire";

  const strengths: string[] = [];
  if (communication >= 75)
    strengths.push("Clear, well-paced communication with strong narrative structure.");
  if (technicalDepth >= 75)
    strengths.push(
      `Demonstrated ${config.level.toLowerCase()}-level depth in ${config.role.toLowerCase()} fundamentals.`,
    );
  if (structure >= 75)
    strengths.push("Answers followed a logical structure with clear trade-offs.");
  if (ownership >= 75)
    strengths.push("Showed strong ownership and personal accountability in examples.");
  if (!strengths.length) strengths.push("Engaged thoughtfully with every question.");

  const improvements: string[] = [];
  if (communication < 75)
    improvements.push("Tighten openings — lead with the headline before diving into context.");
  if (technicalDepth < 75)
    improvements.push(
      `Add more concrete metrics and second-order effects to ${config.role.toLowerCase()} examples.`,
    );
  if (structure < 75)
    improvements.push("Use a STAR framework (Situation, Task, Action, Result) for behavioral answers.");
  if (problemSolving < 75)
    improvements.push("Make trade-offs explicit — name what you chose against and why.");
  if (!improvements.length) improvements.push("Continue to push for executive-level brevity.");

  return {
    id: uid("rep"),
    candidate: candidate.name,
    email: candidate.email,
    role: config.role,
    level: config.level,
    overall,
    rating,
    durationMin: Math.round(
      answers.reduce((s, a) => s + a.durationSec, 0) / 60,
    ),
    generatedAt: new Date().toISOString(),
    breakdown: {
      communication,
      technicalDepth,
      problemSolving,
      structure,
      ownership,
    },
    strengths,
    improvements,
    perQuestion: answers.map((a) => {
      const wc = a.transcript.trim().split(/\s+/).filter(Boolean).length;
      const score = clampScore(60 + Math.min(wc / 6, 30) + jitter());
      const summary =
        wc > 0
          ? `${wc} words, ${Math.round(a.durationSec)}s. ${a.source === "ai-generated" ? "Adaptive follow-up." : "Scripted prompt."}`
          : "No response captured.";
      return {
        question: a.question,
        summary,
        score,
        source: a.source,
      };
    }),
    nextSteps: [
      "Book a 1-hour coaching session with an Apex coach to drill weak areas.",
      "Re-run the simulator focusing on system design depth in 5–7 days.",
      "Prepare two concrete metrics-driven stories before your next live loop.",
    ],
  };
}

export async function generateReportWithAI(
  config: InterviewConfig,
  candidate: { name: string; email: string },
  answers: AnswerRecord[],
): Promise<InterviewReport> {
  const base = generateReport(config, candidate, answers);
  const client = getOpenAIClient();
  if (!client) return base;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an interview evaluator. Return strict JSON with keys: strengths (string[]), improvements (string[]), nextSteps (string[]). Keep each item concise and actionable.",
        },
        {
          role: "user",
          content: JSON.stringify({
            role: config.role,
            level: config.level,
            focusAreas: config.focusAreas,
            overall: base.overall,
            breakdown: base.breakdown,
            answers: answers.map((a) => ({
              question: a.question,
              answer: a.transcript,
              mode: a.mode,
              durationSec: a.durationSec,
              source: a.source,
            })),
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      strengths?: string[];
      improvements?: string[];
      nextSteps?: string[];
    };

    return {
      ...base,
      strengths:
        parsed.strengths?.filter(Boolean).slice(0, 4) ?? base.strengths,
      improvements:
        parsed.improvements?.filter(Boolean).slice(0, 4) ?? base.improvements,
      nextSteps: parsed.nextSteps?.filter(Boolean).slice(0, 4) ?? base.nextSteps,
    };
  } catch {
    return base;
  }
}

function clampScore(n: number) {
  return Math.max(40, Math.min(99, Math.round(n)));
}
function jitter() {
  return Math.round((Math.random() - 0.5) * 6);
}
