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
import type { ParsedResume } from "./resume";
import { uid } from "./utils";

export type QuestionSource = "scripted" | "ai-generated";

export type Difficulty = "easy" | "medium" | "hard";

export type InterviewQuestion = {
  id: string;
  index: number;
  text: string;
  category: ScriptedQuestion["category"] | "follow-up" | "resume-deep-dive";
  source: QuestionSource;
  expectedDurationSec: number;
  rationale?: string;
};

export type InterviewConfig = {
  role: Role;
  level: Level;
  focusAreas: string[];
  totalQuestions?: number;
  interviewerStyle?: "balanced" | "bar-raiser" | "friendly";
  companyTarget?: string;
  stressTest?: boolean;
  difficulty?: Difficulty;
  resume?: ParsedResume;
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "warm and supportive, fundamentals-focused",
  medium: "balanced, probes real trade-offs without piling on",
  hard: "rigorous bar-raiser, pushes edges and expects quantitative rigor",
};

function difficultyFromConfig(config: InterviewConfig): Difficulty {
  if (config.difficulty) return config.difficulty;
  if (config.stressTest) return "hard";
  if (config.interviewerStyle === "bar-raiser") return "hard";
  if (config.interviewerStyle === "friendly") return "easy";
  return "medium";
}

function systemPersona(config: InterviewConfig) {
  const difficulty = difficultyFromConfig(config);
  const style = config.interviewerStyle ?? "balanced";
  const company = config.companyTarget || "a top-tier tech company";
  const stress = config.stressTest ? "Stress-test mode is ON. Push hard with terse, demanding prompts." : "";
  return [
    `You are an expert ${config.role} interviewer at ${company}.`,
    `Seniority bar: ${config.level}.`,
    `Difficulty: ${difficulty.toUpperCase()} — ${DIFFICULTY_LABEL[difficulty]}.`,
    `Interviewer style: ${style}.`,
    stress,
    "You tailor every question to the candidate's actual resume and previous answers.",
    "Ask counter-questions that verify claims and probe depth.",
  ]
    .filter(Boolean)
    .join(" ");
}

function resumeSnippet(config: InterviewConfig, maxChars = 3500): string {
  if (!config.resume?.text) return "No resume provided.";
  const { text, highlights } = config.resume;
  const head = text.slice(0, maxChars);
  return [
    `--- Resume text (truncated) ---\n${head}`,
    highlights?.skills?.length ? `Key skills detected: ${highlights.skills.join(", ")}` : "",
    highlights?.projects?.length ? `Projects snippets: ${highlights.projects.slice(0, 4).join(" | ")}` : "",
    highlights?.achievements?.length ? `Achievements: ${highlights.achievements.slice(0, 3).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Deterministic fallback plan (no OpenAI key). Still references focus areas.
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

  const count = config.totalQuestions ?? 6;
  return ordered.slice(0, count).map((q, i) => ({
    id: q.id,
    index: i,
    text: q.text,
    category: q.category,
    source: "scripted",
    expectedDurationSec: q.expectedDurationSec,
  }));
}

/**
 * Generate a resume-driven, difficulty-tuned interview plan via OpenAI.
 * Returns the fallback scripted plan when no key / API failure.
 */
export async function buildInterviewPlanWithAI(
  config: InterviewConfig,
): Promise<InterviewQuestion[]> {
  const fallback = buildInterviewPlan(config);
  const client = getOpenAIClient();
  if (!client) return fallback;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPersona(config)} Produce an opening interview plan tailored to the resume. Return strict JSON: {"questions":[{"text":string,"category":"intro"|"technical"|"behavioral"|"resume-deep-dive"|"wrap","rationale":string,"expectedDurationSec":number}]}. Include 5-7 opening questions: 1 warm intro, 2-3 resume-deep-dive (projects/achievements/skills from resume), 1 behavioral, 1 role-specific technical, 1 wrap. No markdown, no prose outside JSON.`,
        },
        {
          role: "user",
          content: [
            `Role: ${config.role}`,
            `Level: ${config.level}`,
            `Focus areas: ${config.focusAreas.join(", ") || "general"}`,
            `Difficulty: ${difficultyFromConfig(config)}`,
            `Interviewer style: ${config.interviewerStyle ?? "balanced"}`,
            `Company target: ${config.companyTarget || "generic"}`,
            `Stress test mode: ${config.stressTest ? "on" : "off"}`,
            "",
            resumeSnippet(config),
          ].join("\n"),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as {
      questions?: Array<{
        text?: string;
        category?: InterviewQuestion["category"];
        rationale?: string;
        expectedDurationSec?: number;
      }>;
    };

    const items = (parsed.questions ?? []).filter((q) => q?.text?.trim());
    if (!items.length) return fallback;

    return items.slice(0, 8).map((q, i) => ({
      id: uid("aiq"),
      index: i,
      text: q.text!.trim(),
      category: (q.category as InterviewQuestion["category"]) ?? "technical",
      source: "ai-generated",
      expectedDurationSec:
        typeof q.expectedDurationSec === "number" && q.expectedDurationSec > 0
          ? Math.min(q.expectedDurationSec, 240)
          : 150,
      rationale: q.rationale,
    }));
  } catch {
    return fallback;
  }
}

export async function shouldEndInterviewWithAI(args: {
  config: InterviewConfig;
  answers: AnswerRecord[];
  nextQuestionPreview?: string;
}): Promise<{ shouldEnd: boolean; reason: string }> {
  const { config, answers, nextQuestionPreview } = args;
  const asked = answers.length;
  if (asked <= 3) return { shouldEnd: false, reason: "Minimum depth not reached." };
  if (asked >= 12) return { shouldEnd: true, reason: "Reached max interview depth." };

  const client = getOpenAIClient();
  if (!client) {
    const lastWords =
      answers[answers.length - 1]?.transcript.trim().split(/\s+/).length ?? 0;
    if (asked >= 6 && lastWords > 50) {
      return { shouldEnd: true, reason: "Sufficient signal captured for MVP." };
    }
    return { shouldEnd: false, reason: "Need one more answer for confidence." };
  }

  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `${systemPersona(config)} Decide if the interview has enough signal to stop. Return JSON {shouldEnd:boolean, reason:string}. For harder difficulty, demand more data points before stopping.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            role: config.role,
            level: config.level,
            focusAreas: config.focusAreas,
            difficulty: difficultyFromConfig(config),
            companyTarget: config.companyTarget,
            asked,
            answers: answers.slice(-4).map((a) => ({
              q: a.question,
              a: a.transcript,
              durationSec: a.durationSec,
            })),
            nextQuestionPreview,
          }),
        },
      ],
    });
    const payload = JSON.parse(result.choices[0]?.message?.content ?? "{}") as {
      shouldEnd?: boolean;
      reason?: string;
    };
    return {
      shouldEnd: Boolean(payload.shouldEnd),
      reason: payload.reason || "AI stop decision applied.",
    };
  } catch {
    return { shouldEnd: false, reason: "Fallback decision: continue interview." };
  }
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

export function maybeGenerateFollowUp(
  config: InterviewConfig,
  previousQuestion: InterviewQuestion,
  answer: string,
  alreadyInserted: number,
): InterviewQuestion | null {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  if (previousQuestion.category === "wrap") return null;
  if (wordCount < 12) return null;
  const difficulty = difficultyFromConfig(config);
  const cap = difficulty === "hard" ? 4 : difficulty === "medium" ? 3 : 2;
  if (alreadyInserted >= cap) return null;

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
  priorAnswers: AnswerRecord[] = [],
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
          content: `${systemPersona(config)} Generate exactly one concise counter-question. No preamble, no bullets, no quotes. Max 35 words. Reference a specific detail from resume or previous answers when possible.`,
        },
        {
          role: "user",
          content: [
            `Previous question: ${previousQuestion.text}`,
            `Candidate answer: ${answer}`,
            `Focus areas: ${config.focusAreas.join(", ") || "general"}`,
            `Difficulty: ${difficultyFromConfig(config)}`,
            priorAnswers.length
              ? `Earlier in this interview: ${priorAnswers
                  .slice(-3)
                  .map((a) => `Q:${a.question} A:${a.transcript.slice(0, 220)}`)
                  .join(" | ")}`
              : "",
            "",
            resumeSnippet(config, 1600),
            "",
            "Write ONE sharp follow-up that verifies depth, metrics, ownership, or consistency with the resume.",
          ]
            .filter(Boolean)
            .join("\n"),
        },
      ],
    });
    const aiText = completion.choices[0]?.message?.content?.trim();
    if (!aiText) return fallback;
    return {
      ...fallback,
      text: aiText.replace(/^["']|["']$/g, ""),
      rationale: "Generated by OpenAI from resume + answer context.",
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
  jobReadiness?: {
    summary: string;
    redFlags: string[];
    resumeConsistency: string;
  };
};

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
  const difficulty = difficultyFromConfig(config);
  const difficultyAdj = difficulty === "hard" ? -5 : difficulty === "easy" ? 4 : 0;

  const communication = clampScore(
    baseline + (avgWords > 80 ? 14 : avgWords > 40 ? 8 : 0) + jitter() + difficultyAdj,
  );
  const technicalDepth = clampScore(
    baseline + (avgWords > 120 ? 18 : avgWords > 60 ? 10 : 4) + jitter() + difficultyAdj,
  );
  const problemSolving = clampScore(
    baseline + Math.min(structureHits * 2, 18) + jitter() + difficultyAdj,
  );
  const structure = clampScore(
    baseline + Math.min(structureHits * 2.5, 22) + jitter() + difficultyAdj,
  );
  const ownership = clampScore(baseline + (totalWords > 600 ? 16 : 8) + jitter() + difficultyAdj);

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
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPersona(config)} You are now grading the candidate. Return strict JSON with keys: strengths (string[]), improvements (string[]), nextSteps (string[]), jobReadiness (object with keys summary: string, redFlags: string[], resumeConsistency: string). Each item concise, evidence-based, referencing specific answers or resume details when relevant.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            role: config.role,
            level: config.level,
            focusAreas: config.focusAreas,
            difficulty: difficultyFromConfig(config),
            companyTarget: config.companyTarget,
            overall: base.overall,
            breakdown: base.breakdown,
            resumeSummary: resumeSnippet(config, 1800),
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
      jobReadiness?: {
        summary?: string;
        redFlags?: string[];
        resumeConsistency?: string;
      };
    };

    return {
      ...base,
      strengths:
        parsed.strengths?.filter(Boolean).slice(0, 4) ?? base.strengths,
      improvements:
        parsed.improvements?.filter(Boolean).slice(0, 4) ?? base.improvements,
      nextSteps: parsed.nextSteps?.filter(Boolean).slice(0, 4) ?? base.nextSteps,
      jobReadiness: parsed.jobReadiness
        ? {
            summary: parsed.jobReadiness.summary ?? "",
            redFlags: parsed.jobReadiness.redFlags?.filter(Boolean).slice(0, 4) ?? [],
            resumeConsistency: parsed.jobReadiness.resumeConsistency ?? "",
          }
        : undefined,
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
