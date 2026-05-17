"use client";

import { FOCUS_AREAS } from "@/lib/mock-data";
import {
  assertPlausibleResumeContent,
  RESUME_INVALID_FILE_MESSAGE,
  RESUME_INVALID_PASTE_MESSAGE,
} from "@/lib/resume-validation";

export { RESUME_INVALID_FILE_MESSAGE, RESUME_INVALID_PASTE_MESSAGE };

export type ParsedResume = {
  text: string;
  fileName?: string;
  candidateName?: string;
  parsedAt: string;
  highlights: ResumeHighlights;
};

export type ResumeHighlights = {
  skills: string[];
  projects: string[];
  companies: string[];
  education: string[];
  achievements: string[];
};

/**
 * Client-side resume extraction. Supports:
 *  - Raw text paste
 *  - .txt file upload
 *  - .pdf file upload (via pdfjs-dist, lazy-loaded)
 *
 * We intentionally don't lean on OCR or DOCX parsers for MVP.
 */
export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) {
    const text = await extractPdfText(file);
    return finalize(text, file.name);
  }
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    const text = await file.text();
    return finalize(text, file.name);
  }
  throw new Error(
    "Unsupported file type. Please upload a PDF, TXT, or paste your resume text.",
  );
}

export function parseResumeText(text: string): ParsedResume {
  return finalize(text, undefined, RESUME_INVALID_PASTE_MESSAGE);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist/build/pdf.mjs");
  const version = pdfjsLib.version || "4.0.379";
  // Use a pinned CDN for the worker so it works without custom webpack loaders.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const chunks: string[] = [];
  if (pdf.numPages === 0) {
    throw new Error(RESUME_INVALID_FILE_MESSAGE);
  }
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: any) => ("str" in it ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) chunks.push(pageText);
  }
  const text = chunks.join("\n\n").trim();
  if (text.length < 80) {
    throw new Error(RESUME_INVALID_FILE_MESSAGE);
  }
  return text;
}

/** Re-run validation before payment / start when resume was set earlier in the session. */
export function reassertParsedResume(parsed: ParsedResume): void {
  assertPlausibleResumeContent(parsed.text, parsed.highlights);
}

/** Pick a target role label from admin-configured roles using simple CV text signals. */
export function suggestTargetRoleLabel(resumeText: string, availableRoles: string[]): string {
  if (availableRoles.length === 0) return "";
  const t = resumeText.toLowerCase();
  for (const role of availableRoles) {
    const r = role.toLowerCase();
    if (r && t.includes(r)) return role;
  }
  const tokens = new Set(
    t.split(/[^a-z0-9+.#]+/i).filter((x) => x.length > 2),
  );
  for (const role of availableRoles) {
    const words = role
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2);
    if (words.some((w) => tokens.has(w))) return role;
  }
  return "";
}

export function suggestFocusAreasFromResume(skills: string[]): string[] {
  const lowerSkills = skills.map((s) => s.toLowerCase());
  const picked = FOCUS_AREAS.filter((fa) =>
    lowerSkills.some(
      (sk) =>
        fa.toLowerCase().includes(sk) ||
        sk.includes(fa.toLowerCase().split(/\s+/)[0] ?? ""),
    ),
  );
  if (picked.length > 0) return [...new Set(picked)].slice(0, 5);
  return ["Communication", "Behavioural"];
}

function finalize(
  text: string,
  fileName?: string,
  invalidMessage: string = RESUME_INVALID_FILE_MESSAGE,
): ParsedResume {
  const cleaned = text.replace(/\u0000/g, "").trim();
  const highlights = extractHighlights(cleaned);
  assertPlausibleResumeContent(cleaned, highlights, invalidMessage);
  return {
    text: cleaned.slice(0, 16_000), // safety cap for prompt size
    fileName,
    candidateName: extractCandidateName(cleaned),
    parsedAt: new Date().toISOString(),
    highlights,
  };
}

const KNOWN_SKILLS = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "python",
  "java",
  "go",
  "rust",
  "kotlin",
  "swift",
  "c++",
  "sql",
  "postgres",
  "mongodb",
  "redis",
  "kafka",
  "aws",
  "gcp",
  "azure",
  "docker",
  "kubernetes",
  "graphql",
  "tailwind",
  "figma",
  "product",
  "roadmap",
  "analytics",
  "sql",
  "pandas",
  "tensorflow",
  "pytorch",
  "llm",
  "openai",
  "langchain",
  "a/b testing",
  "growth",
];

function extractHighlights(text: string): ResumeHighlights {
  const lower = text.toLowerCase();

  const skills = Array.from(
    new Set(KNOWN_SKILLS.filter((s) => skillAppearsInText(s, lower))),
  ).slice(0, 15);

  const projects = collectSections(
    text,
    /projects?|experience|work experience|professional experience/gi,
  ).slice(0, 8);
  const companies = collectSections(
    text,
    /experience|employment|work history|professional experience|work experience/gi,
  )
    .filter((line) => line.length > 3 && line.length < 80)
    .slice(0, 6);
  const education = collectSections(text, /education|degree|university|college/gi).slice(0, 5);
  const achievements = collectSections(text, /achievement|award|hackathon|patent|paper|published/gi).slice(0, 6);

  return { skills, projects, companies, education, achievements };
}

function skillAppearsInText(skill: string, lower: string): boolean {
  switch (skill) {
    case "node":
      return /\b(node\.?js|nodejs)\b/i.test(lower);
    case "go":
      return (
        /\bgolang\b/i.test(lower) ||
        /\bgo\s+lang(uage)?\b/i.test(lower) ||
        /\b(?:proficient|experienced|skilled|expert)\s+(?:in|with)\s+go\b/i.test(lower)
      );
    case "java":
      return /\bjava\b/i.test(lower) && !/\bjavascript\b/i.test(lower);
    case "sql":
      return /\bsql\b/i.test(lower);
    case "product":
      return /\bproduct\s+(?:manager|management|owner|design)\b/i.test(lower);
    case "growth":
      return /\b(?:growth|marketing)\s+(?:lead|manager|marketing)\b/i.test(lower);
    default: {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
    }
  }
}

function collectSections(text: string, regex: RegExp): string[] {
  const out: string[] = [];
  const lines = text.split(/\n|•|\u2022/);
  let captureRemaining = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (regex.test(line)) {
      captureRemaining = 5;
      continue;
    }
    if (captureRemaining > 0) {
      if (line.length > 6 && line.length < 220) out.push(line);
      captureRemaining -= 1;
    }
  }
  return out;
}

function extractCandidateName(text: string) {
  const lines = text
    .split(/\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const line of lines.slice(0, 12)) {
    if (line.length < 3 || line.length > 50) continue;
    if (/\d|@|http|linkedin|github|resume|curriculum|vitae|phone|address/i.test(line)) {
      continue;
    }
    // Heuristic: title-cased 2-4 word human name.
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z'-]+$/.test(w));
    if (looksLikeName) return line;
  }

  return undefined;
}
