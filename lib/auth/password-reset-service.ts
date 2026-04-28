import "server-only";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  buildPasswordResetUrl,
  generateVerificationToken,
  hashToken,
  passwordResetTokenTtlMs,
} from "@/lib/auth/tokens";
import { sendMail } from "@/lib/email/transporter";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { findUserByEmail } from "@/lib/auth/verification-service";

export async function issuePasswordResetEmail(rawEmail: string) {
  const email = rawEmail.trim().toLowerCase();
  const user = await findUserByEmail(email);
  if (!user) return;

  await db
    .update(schema.passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(
      sql`${schema.passwordResetTokens.userId} = ${user.id}
          AND ${schema.passwordResetTokens.consumedAt} IS NULL`,
    );

  const { token, tokenHash } = generateVerificationToken();
  const expiresAt = new Date(Date.now() + passwordResetTokenTtlMs());

  await db.insert(schema.passwordResetTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });

  const ttlMinutes = Math.round(passwordResetTokenTtlMs() / (60 * 1000));
  const resetUrl = buildPasswordResetUrl(token);
  const tpl = passwordResetEmail({
    name: user.name,
    resetUrl,
    ttlMinutes,
  });

  await sendMail({
    to: user.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      id: schema.passwordResetTokens.id,
      userId: schema.passwordResetTokens.userId,
      expiresAt: schema.passwordResetTokens.expiresAt,
      consumedAt: schema.passwordResetTokens.consumedAt,
    })
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  const record = rows[0];
  if (!record) return null;
  if (record.consumedAt) return null;
  if (record.expiresAt.getTime() < Date.now()) return null;

  await db
    .update(schema.passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(eq(schema.passwordResetTokens.id, record.id));

  return { userId: record.userId };
}

export async function invalidateOtherPasswordResetTokens(userId: string) {
  await db
    .update(schema.passwordResetTokens)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(schema.passwordResetTokens.userId, userId),
        isNull(schema.passwordResetTokens.consumedAt),
        gt(schema.passwordResetTokens.expiresAt, new Date()),
      ),
    );
}
