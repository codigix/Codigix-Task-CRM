/**
 * Work item keys.
 *
 * Jira takes the prefix from the project — "sterling erp" gives SE-1, SE-2 — so the key
 * tells you what the work belongs to. This does the same: the prefix comes from the
 * project's own code, falling back to the department only for work that has no project
 * (anything sitting in the Backlog).
 *
 * A project's code is derived once from its name and then stored, so it never drifts if
 * the project is renamed and existing keys stay meaningful.
 */

const DEPARTMENT_PREFIX = { Marketing: 'MKT', IT: 'WR', Sales: 'SLS' };

const normalizeDept = (d) => String(d || '').replace(/\s*department\s*$/i, '').trim();

const departmentPrefix = (department) => {
  const dept = normalizeDept(department);
  return DEPARTMENT_PREFIX[dept] || (dept === 'Marketing' ? 'MKT' : 'WR');
};

/**
 * "bakul catering services" -> BCS, "SP Tech erp" -> STE, "Website" -> WEB.
 * Multi-word names use initials; a single word uses its first three letters.
 */
const deriveProjectCode = (name) => {
  const words = String(name || '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return null;

  const code = words.length >= 2
    ? words.slice(0, 3).map(w => w[0]).join('')
    : words[0].slice(0, 3);

  return code.toUpperCase().replace(/[^A-Z0-9]/g, '') || null;
};

/**
 * The project's stored code, deriving and saving one the first time it is needed.
 * Codes are kept unique across projects so two projects can never share a key space.
 */
const getProjectPrefix = async (runner, projectId) => {
  if (!projectId) return null;

  const [[project]] = await runner.query(
    'SELECT id, name, project_id_code FROM projects WHERE id = ?', [projectId]
  );
  if (!project) return null;
  if (project.project_id_code) return project.project_id_code;

  const base = deriveProjectCode(project.name);
  if (!base) return null;

  // Two projects with similar names would otherwise collide; suffix until free.
  const [taken] = await runner.query(
    'SELECT project_id_code FROM projects WHERE project_id_code IS NOT NULL AND id <> ?', [projectId]
  );
  const used = new Set(taken.map(t => String(t.project_id_code).toUpperCase()));

  let code = base;
  let n = 2;
  while (used.has(code)) code = `${base}${n++}`;

  await runner.query('UPDATE projects SET project_id_code = ? WHERE id = ?', [code, projectId]);
  return code;
};

/**
 * The next free key for a prefix.
 *
 * Takes the highest number in use rather than the most recently inserted row: those differ
 * after deletions or out-of-order inserts, and issue_key is UNIQUE, so guessing wrong makes
 * the insert fail outright.
 */
const nextIssueKey = async (runner, prefix) => {
  const [rows] = await runner.query(
    'SELECT issue_key FROM it_kanban_issues WHERE issue_key LIKE ?', [`${prefix}-%`]
  );

  const existingKeys = new Set(rows.map(r => String(r.issue_key).toUpperCase()));

  let highest = 100; // first key of any prefix is -101
  for (const row of rows) {
    const str = String(row.issue_key || '').trim();
    let n = NaN;
    // When prefix has hyphens (e.g. PRJ-2026-0013), slice off `${prefix}-`
    if (str.toUpperCase().startsWith(`${prefix.toUpperCase()}-`)) {
      n = parseInt(str.slice(prefix.length + 1), 10);
    }
    // Fallback: take the last hyphen-delimited chunk
    if (isNaN(n)) {
      const parts = str.split('-');
      n = parseInt(parts[parts.length - 1], 10);
    }
    if (!isNaN(n) && n > highest) highest = n;
  }

  // Ensure candidate key is guaranteed free
  let seq = highest + 1;
  let candidate = `${prefix}-${seq}`;
  while (existingKeys.has(candidate.toUpperCase())) {
    seq++;
    candidate = `${prefix}-${seq}`;
  }
  return candidate;
};

/** Project code when the work has a project, department prefix when it doesn't. */
const resolvePrefix = async (runner, { projectId, department, fallbackPrefix }) => {
  const fromProject = await getProjectPrefix(runner, projectId);
  return fromProject || fallbackPrefix || departmentPrefix(department);
};

module.exports = {
  DEPARTMENT_PREFIX,
  departmentPrefix,
  deriveProjectCode,
  getProjectPrefix,
  nextIssueKey,
  resolvePrefix
};
