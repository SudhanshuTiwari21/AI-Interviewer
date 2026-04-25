import "server-only";

import { eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  buildVerificationUrl,
  generateVerificationToken,
  verificationTokenTtlMs,
} from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/transporter";
import { verificationEmail } from "@/lib/email/templates/verification";

type IssueArgs = {
  userId: string;
  email: string;
  name: string;
};

/**
 * Invalidate any unconsumed tokens for the user, mint a fresh one,
 * and send a new verification email. Called from signup, resend, and
 * the unverified-signup re-issue path.
 */
export async function issueVerificationEmail({ userId, email, name }: IssueArgs) {
  await db
    .update(schema.emailVerificationTokens)
    .set({ consumedAt: new Date() })
    .where(
      sql`${schema.emailVerificationTokens.userId} = ${userId}
          AND ${schema.emailVerificationTokens.consumedAt} IS NULL`,
    );

  const { token, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + verificationTokenTtlMs());

  await db.insert(schema.emailVerificationTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const verificationUrl = buildVerificationUrl(token);
  const ttlHours = Math.round(verificationTokenTtlMs() / (60 * 60 * 1000));

  const tpl = verificationEmail({ name, verificationUrl, ttlHours });

  await sendMail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });

  return { expiresAt };
}

/** Best-effort cleanup of expired verification tokens. */
export async function purgeExpiredVerificationTokens(): Promise<void> {
  await db
    .delete(schema.emailVerificationTokens)
    .where(lt(schema.emailVerificationTokens.expiresAt, new Date()));
}

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(sql`LOWER(${schema.users.email}) = LOWER(${email})`)
    .limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return rows[0] ?? null;
}
