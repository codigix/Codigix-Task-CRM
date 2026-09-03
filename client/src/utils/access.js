/**
 * Who is allowed to plan work.
 *
 * Sprint planning — the Backlog, creating/starting/completing sprints — is a manager
 * activity. Employees work from the board and never see sprint machinery.
 *
 * The designation comes from the route (/it/:designation/:username/...), which is how the
 * rest of the app already decides this. It is a UI gate, not a security boundary: the API
 * is the place to enforce it against a forged URL.
 */
export const isManagerDesignation = (designation) => {
  const d = String(designation || '').toLowerCase();
  if (!d) return false;
  return d.includes('manager') || d.includes('admin') || d.includes('lead');
};

/**
 * Who is allowed to manage projects, assign teams, and view financial details (budget, costing, spent).
 * Only Management, Managers, and Sales are allowed.
 * Team members (developers, designers, etc.) must not see budget/costing or team assignment controls.
 */
export const canViewProjectFinancialsAndManage = (user, designation = '') => {
  const d = String(designation || '').toLowerCase();
  const role = String(user?.role || '').toLowerCase();
  const dept = String(user?.department || '').toLowerCase();

  const isPrivileged = (
    d.includes('manager') ||
    d.includes('admin') ||
    d.includes('management') ||
    d.includes('sales') ||
    d.includes('lead') ||
    role.includes('manager') ||
    role.includes('admin') ||
    role.includes('management') ||
    role.includes('sales') ||
    dept.includes('sales') ||
    dept.includes('management') ||
    dept.includes('admin')
  );

  return Boolean(isPrivileged);
};

export default isManagerDesignation;

