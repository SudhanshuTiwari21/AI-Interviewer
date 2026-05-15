export const RESUME_INVALID_FILE_MESSAGE =
  "Invalid resume content. Please upload a valid resume.";

export const RESUME_INVALID_PASTE_MESSAGE =
  "Invalid resume content. Please provide valid resume details.";

const DUMMY_PATTERNS = [
  /\blorem ipsum\b/i,
  /\btest\s+test\b/i,
  /\basdf\b/i,
  /\bfoo\s+bar\b/i,
  /\bplaceholder\b/i,
  /\bdummy\s+(text|content|resume|cv)\b/i,
  /\bsample\s+text\b/i,
  /^[\s\d\W]+$/,
];

type HighlightLike = {
  skills: string[];
  projects: string[];
  companies: string[];
  education: string[];
  achievements: string[];
};

export function assertPlausibleResumeContent(
  text: string,
  highlights: HighlightLike,
  message: string = RESUME_INVALID_FILE_MESSAGE,
): void {
  const t = text.trim();
  if (t.length < 120) throw new Error(message);

  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 18) throw new Error(message);

  const lower = t.toLowerCase();
  for (const pattern of DUMMY_PATTERNS) {
    if (pattern.test(lower)) throw new Error(message);
  }

  const unique = new Set(words.map((w) => w.toLowerCase()));
  if (unique.size < Math.min(12, Math.floor(words.length * 0.35))) {
    throw new Error(message);
  }

  const sectionHint =
    /\b(experience|employment|work history|professional experience|education|qualifications|skills|projects|summary|objective|profile|achievements|curriculum vitae|cv)\b/i.test(
      lower,
    );
  const contactHint =
    /\S+@\S+\.\S+/.test(t) ||
    /linkedin\.com|github\.com/i.test(t) ||
    /\b\+?\d[\d\s().-]{8,}\d\b/.test(t);

  const roleHint =
    /\b(engineer|developer|manager|analyst|designer|consultant|intern|lead|architect|director)\b/i.test(
      lower,
    );

  const signalCount =
    highlights.skills.length +
    highlights.projects.length +
    highlights.education.length +
    highlights.companies.length +
    highlights.achievements.length;

  const hasStructuredSignals =
    highlights.skills.length >= 2 ||
    highlights.education.length >= 1 ||
    highlights.projects.length >= 2 ||
    (highlights.companies.length >= 1 && highlights.projects.length >= 1);

  if (!(sectionHint || contactHint) || !hasStructuredSignals) {
    throw new Error(message);
  }

  if (!roleHint && signalCount < 2) {
    throw new Error(message);
  }
}
