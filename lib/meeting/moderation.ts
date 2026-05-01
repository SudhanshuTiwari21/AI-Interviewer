import "server-only";

type AlertSeed = {
  severity: "low" | "medium" | "high";
  category: "poaching" | "contact_sharing" | "policy";
  title: string;
};

const RULES: Array<{ pattern: RegExp; seed: AlertSeed }> = [
  {
    pattern:
      /\b(contact me|reach me on|connect on linkedin|message me directly|off-platform)\b/i,
    seed: {
      severity: "high",
      category: "poaching",
      title: "Potential off-platform redirection",
    },
  },
  {
    pattern: /\b(\+?\d{8,15}|@gmail\.com|@yahoo\.com|@outlook\.com|telegram|whatsapp)\b/i,
    seed: {
      severity: "medium",
      category: "contact_sharing",
      title: "Potential direct contact sharing",
    },
  },
];

export function detectModerationFlags(text: string) {
  const matches: AlertSeed[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      matches.push(rule.seed);
    }
  }
  return matches;
}
