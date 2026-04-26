import "server-only";

import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/admin";
import { db, schema } from "@/lib/db/client";
import { ok } from "@/lib/api/response";

export const runtime = "nodejs";

export async function GET() {
  const ctx = await requirePermission("payments.view");
  if (ctx instanceof NextResponse) return ctx;

  const transactions = await db
    .select({
      id: schema.paymentTransactions.id,
      productType: schema.paymentTransactions.productType,
      amountInr: schema.paymentTransactions.amountInr,
      status: schema.paymentTransactions.status,
      createdAt: schema.paymentTransactions.createdAt,
      updatedAt: schema.paymentTransactions.updatedAt,
    })
    .from(schema.paymentTransactions)
    .orderBy(desc(schema.paymentTransactions.createdAt))
    .limit(500);

  return ok({ transactions });
}
