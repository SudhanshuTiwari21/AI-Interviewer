import "server-only";

import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { getSessionFromCookie } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/verification-service";

export const runtime = "nodejs";

const Body = z.object({
  category: z.enum(["payment", "refund", "account", "coaching", "technical", "custom"]),
  subject: z.string().trim().min(5).max(140),
  description: z.string().trim().min(15).max(4000),
});

async function requireSignedInUser() {
  const session = await getSessionFromCookie();
  if (!session) return null;
  const user = await findUserById(session.sub);
  if (!user || !user.emailVerified) return null;
  return user;
}

export async function GET() {
  const user = await requireSignedInUser();
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

  const rows = await db
    .select()
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.userId, user.id))
    .orderBy(desc(schema.supportTickets.createdAt))
    .limit(100);
  return ok({ tickets: rows });
}

export async function POST(req: Request) {
  const user = await requireSignedInUser();
  if (!user) return fail("invalid_credentials", "Please sign in first.", 401);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return fail(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
    );
  }

  const [ticket] = await db
    .insert(schema.supportTickets)
    .values({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      category: parsed.data.category,
      subject: parsed.data.subject,
      description: parsed.data.description,
      status: "open",
      priority: parsed.data.category === "payment" || parsed.data.category === "refund" ? "high" : "medium",
      updatedAt: new Date(),
    })
    .returning();

  return ok({ ticket }, 201);
}
