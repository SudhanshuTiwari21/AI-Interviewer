import "server-only";

import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";
import { listReportsForUser } from "@/lib/server/reports";
import type { InterviewReport, ScoreBreakdown } from "@/lib/question-engine";

export const runtime = "nodejs";

type DeltaPayload = {
  overall: number;
  breakdown: ScoreBreakdown;
};

function deltaBreakdown(current: ScoreBreakdown, baseline: ScoreBreakdown): ScoreBreakdown {
  return {
    communication: current.communication - baseline.communication,
    technicalDepth: current.technicalDepth - baseline.technicalDepth,
    problemSolving: current.problemSolving - baseline.problemSolving,
    structure: current.structure - baseline.structure,
    ownership: current.ownership - baseline.ownership,
  };
}

function computeDelta(current: InterviewReport, baseline: InterviewReport | null): DeltaPayload | null {
  if (!baseline) return null;
  return {
    overall: current.overall - baseline.overall,
    breakdown: deltaBreakdown(current.breakdown, baseline.breakdown),
  };
}

function trendFromDelta(deltaOverall: number | null): "improving" | "stable" | "declining" | "insufficient_data" {
  if (deltaOverall === null) return "insufficient_data";
  if (deltaOverall >= 3) return "improving";
  if (deltaOverall <= -3) return "declining";
  return "stable";
}

export async function GET(req: Request) {
  const session = await getSessionFromCookie();
  if (!session) return fail("invalid_credentials", "Sign in first.", 401);
  const user = await findUserById(session.sub);
  if (!user) return fail("invalid_credentials", "Sign in first.", 401);

  const currentId = new URL(req.url).searchParams.get("currentId");
  if (!currentId) {
    return fail("validation_error", "currentId is required.", 400);
  }

  const reports = await listReportsForUser(user.id);
  if (reports.length === 0) {
    return ok({ progress: null });
  }

  const currentIndex = reports.findIndex((r) => r.id === currentId);
  if (currentIndex === -1) {
    return fail("validation_error", "Report not found for this user.", 404);
  }

  const current = reports[currentIndex];
  const previous = reports[currentIndex + 1] ?? null;
  const first = reports[reports.length - 1] ?? null;

  const recent = reports.slice(0, 5);
  const rollingWindow = reports.slice(currentIndex, currentIndex + 3);
  const rollingAvg3 =
    rollingWindow.length > 0
      ? Math.round(rollingWindow.reduce((sum, r) => sum + r.overall, 0) / rollingWindow.length)
      : current.overall;

  const deltaFromPrevious = computeDelta(current, previous);
  const deltaFromFirst = computeDelta(current, first && first.id !== current.id ? first : null);

  return ok({
    progress: {
      currentReportId: current.id,
      totalInterviews: reports.length,
      trend: trendFromDelta(deltaFromPrevious?.overall ?? null),
      deltaFromPrevious,
      deltaFromFirst,
      rollingAvg3,
      recentScores: recent.map((r) => ({
        id: r.id,
        overall: r.overall,
        generatedAt: r.generatedAt,
      })),
    },
  });
}
