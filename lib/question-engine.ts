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
export type InterviewerMode = "standard" | "ex-google" | "ex-amazon" | "ex-meta";

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
  targetRoleLabel?: string;
  experienceBand?: string;
  interviewType?:
    | "Technical Round"
    | "Managerial Round"
    | "Leadership Round"
    | "HR Round"
    | "Behavioral Round"
    | "Scenario Based Round";
  companyType?:
    | "Startup"
    | "Product Company"
    | "Service Company"
    | "MNC"
    | "Leadership/Internal Promotion";
  focusAreas: string[];
  totalQuestions?: number;
  interviewerStyle?: "balanced" | "bar-raiser" | "friendly";
  companyTarget?: string;
  stressTest?: boolean;
  difficulty?: Difficulty;
  interviewerMode?: InterviewerMode;
  resume?: ParsedResume;
  priorContext?: PriorInterviewContext[];
};

export type PriorInterviewContext = {
  reportId: string;
  generatedAt: string;
  overall: number;
  weakAreas: string[];
  strengths: string[];
  previousQuestions: string[];
};

const INTERVIEWER_MODE_PERSONA: Record<InterviewerMode, string> = {
  standard: "Professional, balanced interviewer with clear and respectful phrasing.",
  "ex-google":
    "FAANG-style interviewer tone: structured problem framing, first-principles reasoning, and clarity on trade-offs.",
  "ex-amazon":
    "High-bar interviewer tone: ownership, customer impact, bias for action, and metrics-backed decisions.",
  "ex-meta":
    "Enterprise interviewer tone: speed, product intuition, experimentation mindset, and scalable execution.",
};

function inferRoleTechnologies(config: InterviewConfig): string[] {
  const roleHints: Record<Role, string[]> = {
    "Frontend Engineer": ["React", "TypeScript", "Next.js", "State management", "Performance"],
    "Backend Engineer": ["Node.js", "API design", "PostgreSQL", "Caching", "Distributed systems"],
    "Full-Stack Engineer": ["React", "Node.js", "PostgreSQL", "System design", "Observability"],
    "Data Scientist": ["Python", "SQL", "Experimentation", "Model evaluation", "Feature engineering"],
    "Product Manager": ["Product strategy", "A/B testing", "Analytics", "Prioritization", "Execution"],
    Designer: ["Figma", "Design systems", "User research", "Interaction design", "Accessibility"],
  };
  const fromRole = roleHints[config.role] ?? [];
  const fromResume = (config.resume?.highlights.skills ?? []).map((s) => normalizeTechLabel(s));
  const fromFocus = config.focusAreas.map((f) => normalizeTechLabel(f));
  return Array.from(new Set([...fromResume, ...fromFocus, ...fromRole])).slice(0, 10);
}

function normalizeTechLabel(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) return trimmed;
  return trimmed
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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
  const techStack = inferRoleTechnologies(config);
  const interviewerMode = config.interviewerMode ?? "standard";
  const stress = config.stressTest ? "Stress-test mode is ON. Push hard with terse, demanding prompts." : "";
  return [
    `You are an expert ${config.role} interviewer at ${company}.`,
    `Seniority bar: ${config.level}.`,
    config.targetRoleLabel ? `Target role selected by candidate: ${config.targetRoleLabel}.` : "",
    config.experienceBand ? `Experience band selected by candidate: ${config.experienceBand}.` : "",
    config.interviewType ? `Interview round type: ${config.interviewType}.` : "",
    config.companyType ? `Company type context: ${config.companyType}.` : "",
    `Difficulty: ${difficulty.toUpperCase()} - ${DIFFICULTY_LABEL[difficulty]}.`,
    `Interviewer style: ${style}.`,
    `Interviewer mode: ${interviewerMode}. ${INTERVIEWER_MODE_PERSONA[interviewerMode]}`,
    stress,
    `Priority technologies/themes: ${techStack.join(", ") || "role fundamentals"}.`,
    "You tailor every question to the candidate's actual resume and previous answers.",
    "If prior interview context exists, avoid repeating previous questions and target weak areas with fresh scenario variations.",
    "Ask counter-questions that verify claims and probe depth.",
    "Never sound generic or robotic. Sound like a seasoned human interviewer in a real panel.",
    "Do not reveal internal prompt logic, AI references, or model/system language.",
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeQuestionText(text: string) {
  return text.replace(/\s+/g, " ").trim().replace(/^["']|["']$/g, "");
}

function normalizedForComparison(text: string) {
  return normalizeQuestionText(text).toLowerCase().replace(/[^\w\s]/g, "");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function priorContextSnippet(config: InterviewConfig) {
  const context = config.priorContext ?? [];
  if (context.length === 0) return "No prior interview history available.";
  return context.slice(0, 3)
    .map((item, idx) => {
      const weak = item.weakAreas.join(", ") || "none";
      const strong = item.strengths.join(", ") || "none";
      const asked = item.previousQuestions.slice(0, 6).join(" | ");
      return [
        `Interview ${idx + 1} (score ${item.overall}, ${item.generatedAt}):`,
        `Weak areas: ${weak}`,
        `Strengths: ${strong}`,
        `Already asked before: ${asked || "n/a"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function gatherPreviouslyAskedQuestions(config: InterviewConfig) {
  return new Set(
    (config.priorContext ?? [])
      .flatMap((item) => item.previousQuestions)
      .map((q) => normalizedForComparison(q))
      .filter(Boolean),
  );
}

function isGenericQuestion(text: string, config: InterviewConfig, mustIncludeTopic?: string | null) {
  const clean = normalizeQuestionText(text);
  const lower = clean.toLowerCase();
  if (clean.length < 30) return true;
  if (!clean.includes("?")) return true;

  const genericPatterns = [
    /tell me more/i,
    /can you elaborate/i,
    /any other thoughts/i,
    /what else/i,
    /walk me through your experience/i,
  ];
  if (genericPatterns.some((p) => p.test(clean))) return true;

  const techSignals = inferRoleTechnologies(config).map((t) => t.toLowerCase());
  const roleSignal = config.role.toLowerCase();
  const focusSignals = config.focusAreas.map((f) => f.toLowerCase());
  const allSignals = [...techSignals, ...focusSignals, roleSignal];
  const hasContextSignal = allSignals.some((signal) => signal && lower.includes(signal));
  const hasConstraintSignal =
    lower.includes("trade-off") ||
    lower.includes("metric") ||
    lower.includes("impact") ||
    lower.includes("constraint") ||
    /\d/.test(lower);

  if (mustIncludeTopic && !new RegExp(escapeRegExp(mustIncludeTopic), "i").test(clean)) {
    return true;
  }

  return !hasContextSignal && !hasConstraintSignal;
}

function chainTopicFromQuestion(question: InterviewQuestion) {
  const rationale = question.rationale ?? "";
  const match = rationale.match(/chain:([^:]+):depth=(\d+)/);
  if (!match) return null;
  return { topic: match[1], depth: Number(match[2]) || 1 };
}

function deriveChainTopic(answer: string, config: InterviewConfig) {
  const keyword = extractKeyword(answer);
  const techSignals = inferRoleTechnologies(config);
  const lower = answer.toLowerCase();
  const matchedTech = techSignals.find((t) => lower.includes(t.toLowerCase()));
  return (matchedTech ?? keyword ?? "your approach").slice(0, 40);
}

function buildChainFollowUp(topic: string, nextDepth: number) {
  if (nextDepth <= 1) {
    return `Let's drill into ${topic}. What exact decision did you make, and what alternatives did you reject?`;
  }
  if (nextDepth === 2) {
    return `Staying on ${topic}, what changed after rollout, and which metric proved your decision was right (or wrong)?`;
  }
  return `Final probe on ${topic}: if you had to redo this under half the timeline, what would you keep, cut, and why?`;
}

async function generateFollowUpTextWithGuard(args: {
  config: InterviewConfig;
  previousQuestion: InterviewQuestion;
  answer: string;
  priorAnswers: AnswerRecord[];
  chainTopic: string;
  chainDepth: number;
  fallback: string;
}) {
  const { config, previousQuestion, answer, priorAnswers, chainTopic, chainDepth, fallback } = args;
  const client = getOpenAIClient();
  if (!client) return fallback;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.45,
        messages: [
          {
            role: "system",
            content: `${systemPersona(config)} Generate exactly one concise counter-question. Max 38 words. Keep it sharply anchored on the same claim/topic.`,
          },
          {
            role: "user",
            content: [
              `Previous question: ${previousQuestion.text}`,
              `Candidate answer: ${answer}`,
              `Counter-question chain topic: ${chainTopic}`,
              `Counter-question chain depth: ${chainDepth} of 3`,
              `Priority technologies: ${inferRoleTechnologies(config).join(", ") || "role fundamentals"}`,
              priorAnswers.length
                ? `Earlier interview context: ${priorAnswers
                    .slice(-3)
                    .map((a) => `Q:${a.question} A:${a.transcript.slice(0, 180)}`)
                    .join(" | ")}`
                : "",
              "Must include at least one concrete anchor: a technology, metric, trade-off, or explicit constraint.",
              "Must sound like a premium human interviewer, not a generic assistant.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      });
      const aiText = normalizeQuestionText(completion.choices[0]?.message?.content ?? "");
      if (aiText && !isGenericQuestion(aiText, config, chainTopic)) {
        return aiText;
      }
    } catch {
      // ignore and fallback
    }
  }
  return fallback;
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
  const askedBefore = gatherPreviouslyAskedQuestions(config);
  const techStack = inferRoleTechnologies(config);
  const resumeProjects = config.resume?.highlights.projects ?? [];
  const resumeAchievements = config.resume?.highlights.achievements ?? [];
  const technical = SCRIPTED_TECHNICAL[config.role] ?? [];
  const ordered: ScriptedQuestion[] = [
    ...SCRIPTED_INTRO,
    ...SCRIPTED_BEHAVIORAL.slice(0, 1),
    ...technical.slice(0, 2),
    ...SCRIPTED_BEHAVIORAL.slice(1, 2),
    ...SCRIPTED_WRAP,
  ];

  const count = config.totalQuestions ?? 6;
  const baseline: InterviewQuestion[] = ordered
    .filter((q) => !askedBefore.has(normalizedForComparison(q.text)))
    .slice(0, Math.max(4, count - 2))
    .map((q, i) => ({
      id: q.id,
      index: i,
      text: q.text,
      category: q.category,
      source: "scripted",
      expectedDurationSec: q.expectedDurationSec,
    }));

  const roleTechQuestions: InterviewQuestion[] = techStack.slice(0, 2).map((tech, i) => ({
    id: uid("rq"),
    index: baseline.length + i,
    text: `Tell me about the most production-critical decision you made using ${tech}. What constraints did you optimize for, and what trade-off did you accept?`,
    category: "technical",
    source: "ai-generated",
    expectedDurationSec: 150,
    rationale: `Role-tech probe on ${tech}.`,
  }));

  const resumeDrivenQuestion =
    resumeProjects[0] || resumeAchievements[0]
      ? [
          {
            id: uid("rq"),
            index: baseline.length + roleTechQuestions.length,
            text: `On your resume, you mentioned "${(resumeProjects[0] ?? resumeAchievements[0])?.slice(0, 90)}". Walk me through your personal ownership, what moved because of your work, and how you validated impact.`,
            category: "resume-deep-dive" as const,
            source: "ai-generated" as const,
            expectedDurationSec: 170,
            rationale: "Resume-grounded ownership verification.",
          },
        ]
      : [];

  return [...baseline, ...roleTechQuestions, ...resumeDrivenQuestion].slice(0, count);
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
          content: `${systemPersona(config)} Produce an opening interview plan tailored to the resume. Return strict JSON: {"questions":[{"text":string,"category":"intro"|"technical"|"behavioral"|"resume-deep-dive"|"wrap","rationale":string,"expectedDurationSec":number}]}. Include 5-7 opening questions. Sequence rules: Q1 MUST be a warm personal intro question, Q2 should be behavioral/problem-framing, resume-project deep dives should start from Q3 onward. Every question must include a concrete anchor (tech, trade-off, metric, constraint, or claim verification). No markdown, no prose outside JSON.`,
        },
        {
          role: "user",
          content: [
            `Role: ${config.role}`,
            `Level: ${config.level}`,
            `Focus areas: ${config.focusAreas.join(", ") || "general"}`,
            `Priority technologies: ${inferRoleTechnologies(config).join(", ") || "role fundamentals"}`,
            `Difficulty: ${difficultyFromConfig(config)}`,
            `Interviewer style: ${config.interviewerStyle ?? "balanced"}`,
            `Company target: ${config.companyTarget || "generic"}`,
            `Interview intensity mode: ${config.stressTest ? "high pressure simulation" : "standard simulation"}`,
            "",
            resumeSnippet(config),
            "",
            "Prior interview history:",
            priorContextSnippet(config),
            "",
            "Hard rule: avoid repeating previously asked questions and prioritize weak-area probes.",
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

    const askedBefore = gatherPreviouslyAskedQuestions(config);
    const items = (parsed.questions ?? [])
      .filter((q) => q?.text?.trim())
      .map((q) => ({
        ...q,
        text: normalizeQuestionText(q.text!),
      }))
      .filter((q) => !isGenericQuestion(q.text!, config))
      .filter((q) => !askedBefore.has(normalizedForComparison(q.text!)));
    if (!items.length) return fallback;

    const normalized = enforceHumanInterviewFlow(
      items.slice(0, 8).map((q, i) => ({
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
      })),
    );

    return normalized.map((q, i) => ({
      id: uid("aiq"),
      index: i,
      text: q.text,
      category: q.category,
      source: q.source,
      expectedDurationSec: q.expectedDurationSec,
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
  "You mentioned {keyword} - can you walk me through the trade-offs you considered there?",
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
  const previousChain = chainTopicFromQuestion(previousQuestion);
  const chainTopic = previousChain?.topic ?? deriveChainTopic(answer, config);
  const chainDepth = Math.min(3, (previousChain?.depth ?? 0) + 1);
  const fallbackText = buildChainFollowUp(chainTopic, chainDepth);
  const text = await generateFollowUpTextWithGuard({
    config,
    previousQuestion,
    answer,
    priorAnswers,
    chainTopic,
    chainDepth,
    fallback: fallbackText,
  });
  return {
    ...fallback,
    text,
    rationale: `Generated from resume + answer context. chain:${chainTopic}:depth=${chainDepth}`,
  };
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
  role: string;
  level: string;
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
  weakAreas: Array<{
    area: keyof ScoreBreakdown | "professionalCommunication";
    title: string;
    score: number;
    impact: number;
    reason: string;
    fix: string;
  }>;
  detailedAnalysis?: {
    executiveSummary: string;
    interviewBehavior: string;
    technicalSignals: string;
    communicationSignals: string;
    riskAssessment: string;
    sevenDayPlan: string[];
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
  const communicationToneAdj = communicationAdjustmentFromResponses(answers);

  const communication = clampScore(
    baseline +
      (avgWords > 80 ? 14 : avgWords > 40 ? 8 : 0) +
      communicationToneAdj +
      jitter() +
      difficultyAdj,
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
  if (communicationToneAdj >= 4)
    strengths.push("Professional tone and courteous interview etiquette were consistently strong.");
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
    improvements.push("Tighten openings - lead with the headline before diving into context.");
  if (communicationToneAdj < 0)
    improvements.push("Use a more professional interview tone: greeting, concise language, and explicit courtesy markers.");
  if (technicalDepth < 75)
    improvements.push(
      `Add more concrete metrics and second-order effects to ${config.role.toLowerCase()} examples.`,
    );
  if (structure < 75)
    improvements.push("Use a STAR framework (Situation, Task, Action, Result) for behavioral answers.");
  if (problemSolving < 75)
    improvements.push("Make trade-offs explicit - name what you chose against and why.");
  if (!improvements.length) improvements.push("Continue to push for executive-level brevity.");

  const weakAreas = buildWeakAreas({
    communication,
    technicalDepth,
    problemSolving,
    structure,
    ownership,
    communicationToneAdj,
  });

  const detailedAnalysis = buildDetailedAnalysis({
    config,
    answers,
    overall,
    communicationToneAdj,
    weakAreas,
    breakdown: {
      communication,
      technicalDepth,
      problemSolving,
      structure,
      ownership,
    },
  });

  return {
    id: uid("rep"),
    candidate: candidate.name,
    email: candidate.email,
    role: config.targetRoleLabel ?? config.role,
    level: config.experienceBand ?? config.level,
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
      "Book a 1-hour coaching session with a Hiro coach to drill weak areas.",
      "Re-run the simulator focusing on system design depth in 5–7 days.",
      "Prepare two concrete metrics-driven stories before your next live loop.",
    ],
    weakAreas,
    detailedAnalysis,
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
          content: `${systemPersona(config)} You are now grading the candidate. Return strict JSON with keys: strengths (string[]), improvements (string[]), nextSteps (string[]), jobReadiness (object with keys summary: string, redFlags: string[], resumeConsistency: string), detailedAnalysis (object with keys executiveSummary: string, interviewBehavior: string, technicalSignals: string, communicationSignals: string, riskAssessment: string, sevenDayPlan: string[]). Each item concise, evidence-based, referencing specific answers or resume details when relevant.`,
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
      detailedAnalysis?: {
        executiveSummary?: string;
        interviewBehavior?: string;
        technicalSignals?: string;
        communicationSignals?: string;
        riskAssessment?: string;
        sevenDayPlan?: string[];
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
      weakAreas: base.weakAreas,
      detailedAnalysis: parsed.detailedAnalysis
        ? {
            executiveSummary:
              parsed.detailedAnalysis.executiveSummary ?? base.detailedAnalysis?.executiveSummary ?? "",
            interviewBehavior:
              parsed.detailedAnalysis.interviewBehavior ?? base.detailedAnalysis?.interviewBehavior ?? "",
            technicalSignals:
              parsed.detailedAnalysis.technicalSignals ?? base.detailedAnalysis?.technicalSignals ?? "",
            communicationSignals:
              parsed.detailedAnalysis.communicationSignals ?? base.detailedAnalysis?.communicationSignals ?? "",
            riskAssessment:
              parsed.detailedAnalysis.riskAssessment ?? base.detailedAnalysis?.riskAssessment ?? "",
            sevenDayPlan:
              parsed.detailedAnalysis.sevenDayPlan?.filter(Boolean).slice(0, 5) ??
              base.detailedAnalysis?.sevenDayPlan ??
              [],
          }
        : base.detailedAnalysis,
    };
  } catch {
    return base;
  }
}

function buildDetailedAnalysis(args: {
  config: InterviewConfig;
  answers: AnswerRecord[];
  overall: number;
  communicationToneAdj: number;
  weakAreas: InterviewReport["weakAreas"];
  breakdown: ScoreBreakdown;
}) {
  const { config, answers, overall, communicationToneAdj, weakAreas, breakdown } = args;
  const answerCount = answers.length;
  const avgDurationSec =
    answerCount > 0
      ? Math.round(answers.reduce((sum, a) => sum + a.durationSec, 0) / answerCount)
      : 0;
  const aiQuestionCount = answers.filter((a) => a.source === "ai-generated").length;
  const weakTitles = weakAreas.slice(0, 2).map((w) => w.title.toLowerCase());
  const topStrength = Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0];
  const topWeakness = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0];

  const readinessBand =
    overall >= 85 ? "highly interview-ready" : overall >= 75 ? "interview-ready with targeted polish" : overall >= 65 ? "close, but inconsistent under pressure" : "not yet interview-ready at target bar";
  const communicationBand =
    communicationToneAdj >= 2
      ? "professional and interviewer-friendly"
      : communicationToneAdj < 0
        ? "needs stronger professional framing and polish"
        : "acceptable but not consistently executive-ready";

  return {
    executiveSummary: `Overall, this performance is ${readinessBand} for a ${config.level} ${config.role} loop. The strongest competency was ${topStrength?.[0] ?? "core execution"}, while the biggest drag came from ${topWeakness?.[0] ?? "consistency"}.`,
    interviewBehavior: `You handled ${answerCount} prompts with an average response length of ~${avgDurationSec}s. ${aiQuestionCount} adaptive probes were introduced to test depth and claim consistency.`,
    technicalSignals: `Technical depth signals were strongest in ${topStrength?.[0] ?? "core reasoning"} and weaker in ${topWeakness?.[0] ?? "detail quality"}. Focus on system constraints, explicit trade-offs, and quantifiable outcomes in each example.`,
    communicationSignals: `Communication quality was ${communicationBand}. Strong answers start with a headline, then 2-3 concrete points, and close with measurable impact.`,
    riskAssessment: weakTitles.length
      ? `Primary hiring risk comes from ${weakTitles.join(" and ")}. If unaddressed, these reduce confidence in consistent on-the-job execution.`
      : "No major hiring blocker was detected; risk is mainly around sustaining quality under tougher follow-up pressure.",
    sevenDayPlan: [
      "Day 1-2: Rewrite two past examples using STAR + metric + trade-off in under 90 seconds each.",
      "Day 3-4: Practice one weak area with 10 targeted drill questions and record your responses.",
      "Day 5: Run a timed mock focused on your lowest-scoring competency only.",
      "Day 6: Review recordings and remove filler language; tighten opening and closing lines.",
      "Day 7: Re-attempt a full mock interview to validate score movement.",
    ],
  };
}

function clampScore(n: number) {
  return Math.max(40, Math.min(99, Math.round(n)));
}
function jitter() {
  return Math.round((Math.random() - 0.5) * 6);
}

function communicationAdjustmentFromResponses(answers: AnswerRecord[]) {
  if (!answers.length) return 0;
  const first = answers[0]?.transcript.toLowerCase() ?? "";
  const allText = answers.map((a) => a.transcript.toLowerCase()).join(" ");
  const words = allText.split(/\s+/).filter(Boolean);
  const totalWords = Math.max(words.length, 1);

  const greetingSignals = [
    "hello",
    "hi",
    "good morning",
    "good afternoon",
    "good evening",
    "nice to meet",
    "pleasure to meet",
    "thank you for having me",
  ];
  const courtesySignals = ["thank you", "thanks", "please", "appreciate", "certainly", "happy to"];
  const fillerSignals = ["um", "uh", "like", "you know", "sort of", "kind of"];

  const greeted = greetingSignals.some((g) => first.includes(g));
  const courtesyHits = courtesySignals.reduce(
    (sum, signal) => sum + countPhrase(allText, signal),
    0,
  );
  const fillerHits = fillerSignals.reduce(
    (sum, signal) => sum + countPhrase(allText, signal),
    0,
  );
  const fillerRatio = fillerHits / totalWords;

  let score = 0;
  if (greeted) score += 3;
  score += Math.min(courtesyHits, 4);
  if (fillerRatio > 0.03) score -= 3;
  else if (fillerRatio > 0.02) score -= 2;

  return Math.max(-6, Math.min(8, score));
}

function countPhrase(text: string, phrase: string) {
  if (!phrase.trim()) return 0;
  return text.split(phrase).length - 1;
}

function buildWeakAreas(args: {
  communication: number;
  technicalDepth: number;
  problemSolving: number;
  structure: number;
  ownership: number;
  communicationToneAdj: number;
}) {
  const items: InterviewReport["weakAreas"] = [];
  const {
    communication,
    technicalDepth,
    problemSolving,
    structure,
    ownership,
    communicationToneAdj,
  } = args;

  if (communicationToneAdj < 0) {
    items.push({
      area: "professionalCommunication",
      title: "Professional communication etiquette",
      score: Math.max(40, communication + communicationToneAdj),
      impact: Math.min(8, Math.abs(communicationToneAdj)),
      reason:
        "The responses had fewer professional greeting/courtesy markers and more filler language than expected.",
      fix: "Open with a brief greeting, keep concise phrasing, and reduce filler words.",
    });
  }
  if (communication < 72) {
    items.push({
      area: "communication",
      title: "Communication clarity",
      score: communication,
      impact: Math.max(4, Math.round((75 - communication) / 2)),
      reason:
        "Some answers lacked a crisp top-line summary before details, reducing clarity.",
      fix: "Use headline first, then 2-3 supporting points with outcomes.",
    });
  }
  if (technicalDepth < 72) {
    items.push({
      area: "technicalDepth",
      title: "Technical depth",
      score: technicalDepth,
      impact: Math.max(4, Math.round((75 - technicalDepth) / 2)),
      reason:
        "The discussion did not consistently include detailed system-level trade-offs and second-order effects.",
      fix: "Add architecture decisions, constraints, and why alternatives were rejected.",
    });
  }
  if (problemSolving < 72) {
    items.push({
      area: "problemSolving",
      title: "Problem-solving rigor",
      score: problemSolving,
      impact: Math.max(4, Math.round((75 - problemSolving) / 2)),
      reason:
        "Reasoning steps were present but not always explicit about assumptions and decision criteria.",
      fix: "State assumptions, options considered, and final decision criteria explicitly.",
    });
  }
  if (structure < 72) {
    items.push({
      area: "structure",
      title: "Answer structure",
      score: structure,
      impact: Math.max(4, Math.round((75 - structure) / 2)),
      reason:
        "Several responses could be better organized into situation, action, and measurable result.",
      fix: "Apply STAR consistently and close each answer with concrete impact.",
    });
  }
  if (ownership < 72) {
    items.push({
      area: "ownership",
      title: "Ownership signal",
      score: ownership,
      impact: Math.max(4, Math.round((75 - ownership) / 2)),
      reason:
        "Examples did not always highlight personal decisions and direct accountability.",
      fix: "Clarify what you personally owned, decided, and delivered.",
    });
  }

  if (!items.length) {
    items.push({
      area: "communication",
      title: "No major weak area detected",
      score: 82,
      impact: 2,
      reason: "Scores were broadly balanced with no clear performance bottleneck.",
      fix: "Keep practicing with higher-difficulty constraints to sharpen edge cases.",
    });
  }

  return items.sort((a, b) => b.impact - a.impact).slice(0, 4);
}

function enforceHumanInterviewFlow(plan: InterviewQuestion[]) {
  if (plan.length === 0) return plan;
  const intro = plan.find((q) => q.category === "intro");
  const behavioral = plan.find((q) => q.category === "behavioral");

  const first: InterviewQuestion =
    intro ??
    {
      id: uid("intro"),
      index: 0,
      text: "Before we go deeper, could you briefly introduce yourself and the kind of roles you are currently targeting?",
      category: "intro",
      source: "ai-generated",
      expectedDurationSec: 90,
      rationale: "Human-style intro opener.",
    };

  const second: InterviewQuestion | null =
    behavioral ??
    plan.find((q) => q.id !== first.id && q.category !== "resume-deep-dive") ??
    null;

  const remaining = plan.filter((q) => q.id !== first.id && q.id !== second?.id);
  const ordered = [first];
  if (second) ordered.push(second);

  const nonResume = remaining.filter((q) => q.category !== "resume-deep-dive");
  const resumeDeepDive = remaining.filter((q) => q.category === "resume-deep-dive");

  return [...ordered, ...nonResume, ...resumeDeepDive].map((q, i) => ({ ...q, index: i }));
}
