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

export default isManagerDesignation;
