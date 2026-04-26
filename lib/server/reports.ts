import "server-only";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { InterviewReport } from "@/lib/question-engine";

export async function saveInterviewReport(args: {
  userId: string;
  report: InterviewReport;
}) {
  const { userId, report } = args;
  await db
    .insert(schema.interviewReports)
    .values({
      id: report.id,
      userId,
      candidate: report.candidate,
      email: report.email,
      role: report.role,
      level: report.level,
      overall: report.overall,
      rating: report.rating,
      durationMin: report.durationMin,
      generatedAt: new Date(report.generatedAt),
      reportData: report as unknown as Record<string, unknown>,
    })
    .onConflictDoUpdate({
      target: schema.interviewReports.id,
      set: {
        overall: report.overall,
        rating: report.rating,
        durationMin: report.durationMin,
        generatedAt: new Date(report.generatedAt),
        reportData: report as unknown as Record<string, unknown>,
      },
    });
}

export async function listReportsForUser(userId: string): Promise<InterviewReport[]> {
  const rows = await db
    .select()
    .from(schema.interviewReports)
    .where(eq(schema.interviewReports.userId, userId))
    .orderBy(desc(schema.interviewReports.generatedAt))
    .limit(100);
  return rows.map((r) => r.reportData as InterviewReport);
}

export async function listAllReports(): Promise<InterviewReport[]> {
  const rows = await db
    .select()
    .from(schema.interviewReports)
    .orderBy(desc(schema.interviewReports.generatedAt))
    .limit(500);
  return rows.map((r) => r.reportData as InterviewReport);
}

export async function getReportById(id: string): Promise<InterviewReport | null> {
  const rows = await db
    .select()
    .from(schema.interviewReports)
    .where(eq(schema.interviewReports.id, id))
    .limit(1);
  const row = rows[0];
  return row ? (row.reportData as InterviewReport) : null;
}
