import { z } from "zod";

export const PASSWORD_MAX_LENGTH = 200;

/** Human-readable bullets (without leading "• "). */
export const PASSWORD_POLICY_BULLETS = [
  "Be at least 8 characters long",
  "Include at least one letter",
  "Include at least one number",
  "Include at least one special character",
] as const;

function hasLetter(s: string) {
  return /[a-zA-Z]/.test(s);
}

function hasNumber(s: string) {
  return /\d/.test(s);
}

function hasSpecial(s: string) {
  return /[^a-zA-Z0-9]/.test(s);
}

/**
 * Returns a multi-line message listing unmet rules, or null if the password satisfies policy.
 * First line: "The password must:" then bullet lines.
 */
export function formatPasswordPolicyError(password: string): string | null {
  const lines: string[] = [];
  if (password.length < 8) lines.push(PASSWORD_POLICY_BULLETS[0]);
  if (!hasLetter(password)) lines.push(PASSWORD_POLICY_BULLETS[1]);
  if (!hasNumber(password)) lines.push(PASSWORD_POLICY_BULLETS[2]);
  if (!hasSpecial(password)) lines.push(PASSWORD_POLICY_BULLETS[3]);
  if (lines.length === 0) return null;
  return ["The password must:", ...lines.map((line) => `• ${line}`)].join("\n");
}

export const passwordSchema = z
  .string()
  .max(
    PASSWORD_MAX_LENGTH,
    `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`,
  )
  .superRefine((val, ctx) => {
    const msg = formatPasswordPolicyError(val);
    if (msg) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg });
    }
  });
