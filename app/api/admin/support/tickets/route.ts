import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { fail, ok } from "@/lib/api/response";
import { requirePermission } from "@/lib/auth/admin";
import { recordAudit } from "@/lib/audit";
import { notifyCandidateSupportTicketClosed } from "@/lib/support/ticket-notifications";

export const runtime = "nodejs";

const Query = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  category: z
    .enum(["payment", "refund", "account", "coaching", "technical", "custom"])
    .optional(),
});

const PatchNoteOnly = z.object({
  ticketId: z.string().uuid(),
  updateAdminNoteOnly: z.literal(true),
  adminNote: z.string().trim().max(2000),
});

const PatchStatus = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  adminNote: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const Patch = z.union([PatchNoteOnly, PatchStatus]);

export async function GET(req: Request) {
  const ctx = await requirePermission("support.view");
  if (ctx instanceof Response) return ctx;

  const queryParse = Query.safeParse(
    Object.fromEntries(new URL(req.url).searchParams.entries()),
  );
  if (!queryParse.success) {
    return fail("validation_error", queryParse.error.issues[0]?.message ?? "Invalid filters", 400);
  }

  const filters = [];
  if (queryParse.data.status) {
    filters.push(eq(schema.supportTickets.status, queryParse.data.status));
  }
  if (queryParse.data.category) {
    filters.push(eq(schema.supportTickets.category, queryParse.data.category));
  }
  const where = filters.length > 0 ? and(...filters) : undefined;

  const rows = await (where
    ? db
        .select()
        .from(schema.supportTickets)
        .where(where)
        .orderBy(desc(schema.supportTickets.createdAt))
        .limit(300)
    : db
        .select()
        .from(schema.supportTickets)
        .orderBy(desc(schema.supportTickets.createdAt))
        .limit(300));

  return ok({ tickets: rows });
}

export async function PATCH(req: Request) {
  const ctx = await requirePermission("support.manage");
  if (ctx instanceof Response) return ctx;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return fail("validation_error", "Invalid JSON body", 400);
  }
  const parsed = Patch.safeParse(json);
  if (!parsed.success) {
    return fail(
      "validation_error",
      parsed.error.issues[0]?.message ?? "Invalid input",
      400,
    );
  }

  if ("updateAdminNoteOnly" in parsed.data && parsed.data.updateAdminNoteOnly) {
    const [ticket] = await db
      .update(schema.supportTickets)
      .set({
        adminNote: parsed.data.adminNote,
        updatedAt: new Date(),
      })
      .where(eq(schema.supportTickets.id, parsed.data.ticketId))
      .returning();

    if (!ticket) {
      return fail("user_not_found", "Ticket not found", 404);
    }

    await recordAudit(ctx, {
      action: "support.ticket.update",
      targetType: "support_ticket",
      targetId: ticket.id,
      metadata: {
        status: ticket.status,
        adminNote: parsed.data.adminNote,
        noteOnly: true,
      },
    });

    return ok({ ticket });
  }

  if (!("status" in parsed.data)) {
    return fail("validation_error", "Invalid ticket update payload.", 400);
  }

  const body = parsed.data;
  const now = new Date();
  const existing = await db
    .select()
    .from(schema.supportTickets)
    .where(eq(schema.supportTickets.id, body.ticketId))
    .limit(1);
  const before = existing[0];

  const [ticket] = await db
    .update(schema.supportTickets)
    .set({
      status: body.status,
      ...(body.adminNote !== undefined ? { adminNote: body.adminNote } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      resolvedAt:
        body.status === "resolved" || body.status === "closed" ? now : null,
      resolvedBy:
        body.status === "resolved" || body.status === "closed" ? ctx.user.id : null,
      updatedAt: now,
    })
    .where(eq(schema.supportTickets.id, body.ticketId))
    .returning();

  if (!ticket) {
    return fail("user_not_found", "Ticket not found", 404);
  }

  await recordAudit(ctx, {
    action: "support.ticket.update",
    targetType: "support_ticket",
    targetId: ticket.id,
    metadata: {
      status: body.status,
      priority: body.priority ?? ticket.priority,
      adminNote: body.adminNote ?? null,
    },
  });

  if (body.status === "closed" && before?.status !== "closed") {
    try {
      await notifyCandidateSupportTicketClosed(ticket);
    } catch (err) {
      console.error("[admin/support/tickets] closed notify", err);
    }
  }

  return ok({ ticket });
}
