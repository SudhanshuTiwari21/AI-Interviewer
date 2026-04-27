import type { InterviewReport } from "@/lib/question-engine";

export type ReportInsight = {
  noveltyScore: number;
  challengeScore: number;
  challengeDeltaFromPrevious: number | null;
};

function normalizeQuestion(text: string) {
  return text.toLowerCase().replaceAll(/[^\w\s]/g, " ").replaceAll(/\s+/g, " ").trim();
}

function candidateKey(report: InterviewReport) {
  return report.email?.toLowerCase().trim() || report.candidate.toLowerCase().trim();
}

function questionChallenge(question: string, source: "scripted" | "ai-generated") {
  const lower = question.toLowerCase();
  let score = 45;
  if (source === "ai-generated") score += 10;
  if (
    /trade[- ]?off|constraint|metric|impact|failed|recover|under|what would you do|real|scenario/.test(
      lower,
    )
  ) {
    score += 12;
  }
  if (question.length > 110) score += 6;
  return Math.max(25, Math.min(95, score));
}

function computeChallengeScore(report: InterviewReport) {
  if (!report.perQuestion.length) return 0;
  const total = report.perQuestion.reduce(
    (sum, q) => sum + questionChallenge(q.question, q.source),
    0,
  );
  return Math.round(total / report.perQuestion.length);
}

export function buildReportInsights(reports: InterviewReport[]) {
  const byCandidate = new Map<string, InterviewReport[]>();
  for (const report of reports) {
    const key = candidateKey(report);
    const list = byCandidate.get(key) ?? [];
    list.push(report);
    byCandidate.set(key, list);
  }

  const insights = new Map<string, ReportInsight>();

  for (const list of byCandidate.values()) {
    const chronological = [...list].sort(
      (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime(),
    );
    const seenQuestions = new Set<string>();
    let previousChallenge: number | null = null;

    for (const report of chronological) {
      const uniqueQuestions = Array.from(
        new Set(report.perQuestion.map((q) => normalizeQuestion(q.question)).filter(Boolean)),
      );
      const unseen = uniqueQuestions.filter((q) => !seenQuestions.has(q)).length;
      const noveltyScore =
        uniqueQuestions.length > 0
          ? Math.round((unseen / uniqueQuestions.length) * 100)
          : 100;
      for (const question of uniqueQuestions) {
        seenQuestions.add(question);
      }

      const challengeScore = computeChallengeScore(report);
      const challengeDeltaFromPrevious =
        previousChallenge === null ? null : challengeScore - previousChallenge;
      previousChallenge = challengeScore;

      insights.set(report.id, {
        noveltyScore,
        challengeScore,
        challengeDeltaFromPrevious,
      });
    }
  }

  return insights;
}
