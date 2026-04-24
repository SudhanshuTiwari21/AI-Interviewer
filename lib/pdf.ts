"use client";

import type { InterviewReport } from "./question-engine";

/**
 * Build a clean, branded PDF from a report. We dynamic-import jspdf so it
 * doesn't bloat the initial bundle.
 */
export async function downloadReportPdf(report: InterviewReport) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  let y = M;

  // Header band
  doc.setFillColor(14, 18, 32);
  doc.rect(0, 0, W, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Apex Interview Report", M, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `${report.role} · ${report.level} · ${new Date(report.generatedAt).toLocaleString()}`,
    M,
    78,
  );
  doc.setTextColor(180, 200, 255);
  doc.text("apex.app", W - M, 78, { align: "right" });

  // Score callout
  y = 150;
  doc.setDrawColor(220, 224, 234);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, y, W - M * 2, 90, 10, 10, "S");
  doc.setTextColor(14, 18, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.text(String(report.overall), M + 24, y + 58);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 130);
  doc.text("Overall score", M + 24, y + 75);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(14, 18, 32);
  doc.text(`Recommendation: ${report.rating}`, M + 160, y + 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 110, 130);
  doc.text(
    `Candidate: ${report.candidate} · Email: ${report.email}`,
    M + 160,
    y + 60,
  );
  doc.text(
    `Duration: ${report.durationMin} min · Questions: ${report.perQuestion.length}`,
    M + 160,
    y + 75,
  );

  // Breakdown
  y += 110;
  sectionTitle(doc, "Skill breakdown", M, y);
  y += 20;
  Object.entries(report.breakdown).forEach(([k, v]) => {
    drawBar(doc, M, y, W - M * 2, k.replace(/([A-Z])/g, " $1"), v);
    y += 28;
  });

  y += 8;
  sectionTitle(doc, "Strengths", M, y);
  y += 18;
  y = drawBullets(doc, report.strengths, M, y, W - M * 2);

  y += 12;
  sectionTitle(doc, "Areas to improve", M, y);
  y += 18;
  y = drawBullets(doc, report.improvements, M, y, W - M * 2);

  if (report.weakAreas?.length) {
    y += 12;
    sectionTitle(doc, "Score drop reasons", M, y);
    y += 18;
    report.weakAreas.forEach((w) => {
      y = ensureSpace(doc, y, 72, M);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(14, 18, 32);
      doc.text(`${w.title} (-${w.impact} pts)`, M, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 90, 110);
      const reason = doc.splitTextToSize(`Reason: ${w.reason}`, W - M * 2);
      doc.text(reason, M, y);
      y += reason.length * 12;
      const fix = doc.splitTextToSize(`Fix: ${w.fix}`, W - M * 2);
      doc.text(fix, M, y);
      y += fix.length * 12 + 6;
    });
  }

  y += 12;
  sectionTitle(doc, "Per-question feedback", M, y);
  y += 18;
  doc.setFontSize(10);
  report.perQuestion.forEach((q, i) => {
    y = ensureSpace(doc, y, 60, M);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(14, 18, 32);
    doc.text(`Q${i + 1}. ${q.question}`, M, y, { maxWidth: W - M * 2 });
    const lines = doc.splitTextToSize(q.question, W - M * 2);
    y += lines.length * 12 + 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 130);
    doc.text(`Score: ${q.score} · ${q.summary}`, M, y);
    y += 18;
  });

  y += 8;
  sectionTitle(doc, "Recommended next steps", M, y);
  y += 18;
  y = drawBullets(doc, report.nextSteps, M, y, W - M * 2);

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(140, 150, 170);
    doc.text(
      `Apex · Confidential · ${report.candidate}`,
      M,
      H - 24,
    );
    doc.text(`Page ${p} of ${pages}`, W - M, H - 24, { align: "right" });
  }

  doc.save(`apex-report-${report.role.replace(/\s+/g, "-").toLowerCase()}-${report.id}.pdf`);
}

function sectionTitle(doc: any, label: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(14, 18, 32);
  doc.text(label, x, y);
}

function drawBullets(doc: any, items: string[], x: number, y: number, w: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 90);
  items.forEach((t) => {
    const lines = doc.splitTextToSize(`• ${t}`, w);
    y = ensureSpace(doc, y, lines.length * 12 + 6, 48);
    doc.text(lines, x, y);
    y += lines.length * 12 + 4;
  });
  return y;
}

function drawBar(
  doc: any,
  x: number,
  y: number,
  w: number,
  label: string,
  value: number,
) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 70, 90);
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  doc.text(cap, x, y);
  doc.text(String(value), x + w, y, { align: "right" });
  doc.setFillColor(238, 240, 244);
  doc.roundedRect(x, y + 4, w, 6, 3, 3, "F");
  doc.setFillColor(58, 102, 245);
  doc.roundedRect(x, y + 4, (w * value) / 100, 6, 3, 3, "F");
}

function ensureSpace(doc: any, y: number, needed: number, margin: number) {
  const H = doc.internal.pageSize.getHeight();
  if (y + needed > H - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}
