import type { User } from "./store";

export type DemoPlan = "free" | "starter" | "pro" | "team";

export function normalizePlan(plan: User["plan"]): DemoPlan {
  if (plan === "starter" || plan === "pro" || plan === "team") return plan;
  return "free";
}

export function planLabel(plan: DemoPlan) {
  switch (plan) {
    case "free":
      return "Free";
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "team":
      return "Team";
  }
}

export function canUsePremiumControls(plan: DemoPlan) {
  return plan === "pro" || plan === "team";
}

export function canUseStressTest(plan: DemoPlan) {
  return plan === "team";
}

export function maxQuestionCount(plan: DemoPlan) {
  // Questions are intentionally dynamic and not capped by plan.
  return Number.POSITIVE_INFINITY;
}

export function coachingCredits(plan: DemoPlan) {
  switch (plan) {
    case "free":
      return "0";
    case "starter":
      return "0";
    case "pro":
      return "1";
    case "team":
      return "∞";
  }
}

export function attemptsPerMonth(plan: DemoPlan) {
  switch (plan) {
    case "free":
      return 2;
    case "starter":
      return 6;
    case "pro":
      return 20;
    case "team":
      return Number.POSITIVE_INFINITY;
  }
}

export function usedAttemptsThisMonth(
  generatedAtValues: string[],
  now = new Date(),
) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return generatedAtValues.filter((iso) => {
    const d = new Date(iso);
    return d.getFullYear() === y && d.getMonth() === m;
  }).length;
}

export function premiumPlanFeatures(plan: DemoPlan): string[] {
  if (plan === "team") {
    return [
      "Unlimited monthly attempts",
      "Company-specific interview packs",
      "Bar-raiser + stress-test interviewer modes",
      "Advanced benchmark insights and readiness signals",
      "Priority coaching and team-level analytics",
    ];
  }
  if (plan === "pro") {
    return [
      "20 monthly attempts",
      "Company-specific interview packs",
      "Bar-raiser interviewer mode",
      "AI-enhanced report recommendations",
      "1 coaching credit",
    ];
  }
  if (plan === "starter") {
    return [
      "6 monthly attempts",
      "Role-specific scripted + adaptive prompts",
      "Voice + text interview support",
      "Standard score report",
    ];
  }
  return [
    "2 monthly attempts",
    "Core interview simulator",
    "Basic report and coaching upsell",
  ];
}
