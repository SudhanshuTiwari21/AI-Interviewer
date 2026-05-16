export const INTERVIEW_PRICE_INR = 199;

export function canUsePremiumControls() {
  return true;
}

export function canUseStressTest() {
  return true;
}

export function maxQuestionCount() {
  // Questions are intentionally dynamic and not capped.
  return Number.POSITIVE_INFINITY;
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

export function premiumPlanFeatures(): string[] {
  return [
    "Company-specific interview packs",
    "Bar-raiser + stress-test interviewer modes",
    "Advanced benchmark insights and readiness signals",
    "Detailed weak-area analysis in reports",
    "Priority coaching recommendations",
  ];
}
