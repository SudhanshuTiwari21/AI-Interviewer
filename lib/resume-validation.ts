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

/** Ops manuals, runbooks, and internal docs that are not CVs. */
const NON_RESUME_DOCUMENT_PATTERNS = [
  /\binternal\s+reference\b/i,
  /\breference\s+draft\b/i,
  /\bextracted\s+draft\b/i,
  /\bversion\s*:\s*[\d.A-Za-z-]+/i,
  /\bnode\s+id\s*:/i,
  /\bsync\s+window\b/i,
  /\bregion\s+cluster\b/i,
  /\bpriority\s+layer\b/i,
  /\bmonitoring\s+routines\b/i,
  /\brelay\s+(?:tracking|channel)/i,
  /\bcycle\s+\d+\s*:/i,
  /\bmaintenance\s+summary\b/i,
  /\barchive\s+(?:layer|replication|segment)/i,
  /\bpacket\s+delay\b/i,
  /\bqueue\s+balancing\b/i,
  /\bsession\s+recovery\s+layer\b/i,
  /\bend\s+of\s+extracted\b/i,
  /\bobservation\s+notes\b/i,
  /\bactive\s+modules\b/i,
  /\bescalation\s+required\b/i,
  /\bservice\s+interruption\b/i,
];

const RESUME_SECTION_PATTERNS = [
  /\bwork\s+experience\b/i,
  /\bprofessional\s+experience\b/i,
  /\bwork\s+history\b/i,
  /\bemployment\s+history\b/i,
  /\bemployment\b/i,
  /\beducation\b/i,
  /\b(academic\s+background|qualifications)\b/i,
  /\b(certifications?|licenses?)\b/i,
  /\b(curriculum\s+vitae|resume|cv)\b/i,
  /\btechnical\s+skills\b/i,
  /\b(core\s+competencies|key\s+skills)\b/i,
  /\b(professional\s+summary|executive\s+summary|summary\s+of\s+qualifications)\b/i,
  /\bskills\s*:/i,
  /\bprojects\s*:/i,
];

/** Job titles as whole roles, not words like "Engine" in product names. */
const ROLE_TITLE_PATTERN =
  /\b(software|data|systems|platform|backend|frontend|full[- ]?stack|devops|cloud|security|mobile|qa|test|product|project|engineering|marketing|sales|hr|finance|business)\s+(engineer|developer|manager|analyst|designer|consultant|architect|director|lead|intern)\b/i;

const UNAMBIGUOUS_SKILL_MIN_LENGTH = 5;

type HighlightLike = {
  skills: string[];
  projects: string[];
  companies: string[];
  education: string[];
  achievements: string[];
};

function countNonResumeSignals(lower: string): number {
  let hits = 0;
  for (const pattern of NON_RESUME_DOCUMENT_PATTERNS) {
    if (pattern.test(lower)) hits += 1;
  }
  return hits;
}

function hasResumeSectionHeading(lower: string): boolean {
  return RESUME_SECTION_PATTERNS.some((pattern) => pattern.test(lower));
}

function unambiguousSkillCount(skills: string[]): number {
  return skills.filter((s) => s.length >= UNAMBIGUOUS_SKILL_MIN_LENGTH).length;
}

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

  if (countNonResumeSignals(lower) >= 2) {
    throw new Error(message);
  }

  const unique = new Set(words.map((w) => w.toLowerCase()));
  if (unique.size < Math.min(12, Math.floor(words.length * 0.35))) {
    throw new Error(message);
  }

  const sectionHint = hasResumeSectionHeading(lower);
  const contactHint =
    /\S+@\S+\.\S+/.test(t) ||
    /linkedin\.com|github\.com/i.test(t) ||
    /\b\+?\d[\d\s().-]{8,}\d\b/.test(t);

  const roleHint = ROLE_TITLE_PATTERN.test(t);

  const signalCount =
    highlights.skills.length +
    highlights.projects.length +
    highlights.education.length +
    highlights.companies.length +
    highlights.achievements.length;

  const strongSkills = unambiguousSkillCount(highlights.skills);

  const hasStructuredSignals =
    highlights.education.length >= 1 ||
    highlights.companies.length >= 1 ||
    highlights.projects.length >= 2 ||
    (highlights.companies.length >= 1 && highlights.projects.length >= 1) ||
    (contactHint && strongSkills >= 2) ||
    (sectionHint && strongSkills >= 2) ||
    (sectionHint &&
      (highlights.education.length >= 1 ||
        highlights.companies.length >= 1 ||
        highlights.projects.length >= 1));

  if (!(sectionHint || contactHint) || !hasStructuredSignals) {
    throw new Error(message);
  }

  if (!roleHint && !contactHint && signalCount < 3) {
    throw new Error(message);
  }
}
