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
  /\b(career\s+summary|profile\s+summary)\b/i,
  /\bskills\s*:/i,
  /\bprojects\s*:/i,
  /(?:^|\n)\s*(?:work\s+)?experience\s*:?\s*(?:\n|$)/im,
  /(?:^|\n)\s*skills\s*:?\s*(?:\n|$)/im,
  /(?:^|\n)\s*education\s*:?\s*(?:\n|$)/im,
];

/** Job titles as whole roles, not words like "Engine" in product names. */
const ROLE_TITLE_PATTERN =
  /\b(software|data|systems|platform|backend|frontend|full[- ]?stack|devops|cloud|security|mobile|qa|product|project|engineering|marketing|sales|hr|finance|business)\s+(engineer|developer|manager|analyst|designer|consultant|architect|director|lead|intern)\b/i;

const JOB_TITLE_LINE_PATTERN =
  /\b(senior|junior|lead|principal|staff|associate)?\s*(software|full[- ]?stack|frontend|backend|data|devops|mobile|qa|product|business|hr|marketing|sales|finance)?\s*(engineer|developer|manager|analyst|designer|consultant|architect|intern)\b/i;

const WORK_HISTORY_DATE_PATTERN =
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{2,4}\b/i;
const WORK_HISTORY_YEAR_RANGE_PATTERN =
  /\b(?:19|20)\d{2}\s*(?:-|to)\s*(?:present|current|(?:19|20)\d{2})\b/i;

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

function hasWorkHistoryDates(text: string): boolean {
  return (
    WORK_HISTORY_DATE_PATTERN.test(text) || WORK_HISTORY_YEAR_RANGE_PATTERN.test(text)
  );
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

  if (countNonResumeSignals(lower) >= 3) {
    throw new Error(message);
  }

  const unique = new Set(words.map((w) => w.toLowerCase()));
  if (unique.size < Math.min(10, Math.floor(words.length * 0.3))) {
    throw new Error(message);
  }

  const sectionHint = hasResumeSectionHeading(lower);
  const contactHint =
    /\S+@\S+\.\S+/.test(t) ||
    /linkedin\.com|github\.com/i.test(t) ||
    /\b\+?\d[\d\s().-]{8,}\d\b/.test(t);

  const roleHint = ROLE_TITLE_PATTERN.test(t) || JOB_TITLE_LINE_PATTERN.test(t);
  const workDates = hasWorkHistoryDates(t);

  const signalCount =
    highlights.skills.length +
    highlights.projects.length +
    highlights.education.length +
    highlights.companies.length +
    highlights.achievements.length;

  const hasStructuredSignals =
    highlights.education.length >= 1 ||
    highlights.companies.length >= 1 ||
    highlights.projects.length >= 1 ||
    highlights.achievements.length >= 1 ||
    highlights.skills.length >= 2 ||
    (contactHint && highlights.skills.length >= 1) ||
    (contactHint && (roleHint || workDates)) ||
    (sectionHint && (contactHint || highlights.skills.length >= 1 || roleHint)) ||
    (sectionHint && (highlights.companies.length >= 1 || highlights.education.length >= 1));

  if (!(sectionHint || contactHint)) {
    throw new Error(message);
  }

  if (!hasStructuredSignals) {
    throw new Error(message);
  }

  if (!contactHint && !roleHint && !sectionHint && signalCount < 1) {
    throw new Error(message);
  }
}
