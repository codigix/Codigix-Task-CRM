/**
 * Labels are free-form tags for grouping that cuts across the structured fields — themes,
 * campaigns, triage states. They are deliberately not a substitute for department, team,
 * status or project, which are real fields with proper filtering behind them.
 *
 * Because anyone can type a new one, the only thing keeping them useful is a consistent
 * shape: without it "Tech Debt", "tech debt" and "TechDebt" become three separate tags that
 * no filter can bring back together.
 */

/** Jira's shape: lowercase, no spaces, hyphen-separated. */
export const normalizeLabel = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s_-]/g, '')   // drop punctuation that would fragment tags
  .replace(/[\s_]+/g, '-')          // spaces and underscores become hyphens
  .replace(/-+/g, '-')              // collapse runs of hyphens
  .replace(/^-|-$/g, '');           // no leading or trailing hyphen

/** Normalises, drops blanks, and removes duplicates while keeping order. */
export const normalizeLabels = (list) => {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(normalizeLabel)
    .filter(l => l && !seen.has(l) && seen.add(l));
};

/**
 * Starting points offered when a board has no labels of its own yet. These describe the
 * kind of work or the campaign — the things worth grouping across projects and sprints —
 * rather than repeating the department, which every ticket on the board already shares.
 */
export const SUGGESTED_LABELS = {
  Marketing: ['seo', 'gmb', 'blog', 'social', 'paid-ads', 'creative', 'wordpress', 'client-onboarding'],
  IT: ['tech-debt', 'security', 'performance', 'bug-fix', 'infrastructure', 'api', 'frontend', 'backend']
};

export const suggestionsFor = (department) => SUGGESTED_LABELS[department] || SUGGESTED_LABELS.IT;

export default normalizeLabel;
