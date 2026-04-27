"use client";

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
  return finalize(text);
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib: any = await import("pdfjs-dist/build/pdf.mjs");
  const version = pdfjsLib.version || "4.0.379";
  // Use a pinned CDN for the worker so it works without custom webpack loaders.
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const chunks: string[] = [];
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
  return chunks.join("\n\n");
}

function finalize(text: string, fileName?: string): ParsedResume {
  const cleaned = text.replace(/\u0000/g, "").trim();
  return {
    text: cleaned.slice(0, 16_000), // safety cap for prompt size
    fileName,
    candidateName: extractCandidateName(cleaned),
    parsedAt: new Date().toISOString(),
    highlights: extractHighlights(cleaned),
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
    new Set(KNOWN_SKILLS.filter((s) => lower.includes(s))),
  ).slice(0, 15);

  const projects = collectSections(text, /projects?|experience/gi).slice(0, 8);
  const companies = Array.from(
    new Set(
      text
        .split(/\n|\.|,/)
        .map((s) => s.trim())
        .filter((s) => /[A-Z][a-zA-Z]+(?: Inc| LLC| Labs| Technologies| Studios| Corp)?/.test(s))
        .slice(0, 8),
    ),
  ).slice(0, 6);
  const education = collectSections(text, /education|degree|university|college/gi).slice(0, 5);
  const achievements = collectSections(text, /achievement|award|hackathon|patent|paper|published/gi).slice(0, 6);

  return { skills, projects, companies, education, achievements };
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
