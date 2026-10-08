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

/**
 * Who may delete a ticket. Everyone can edit tickets, but only managers (and admins) can
 * delete them. Mirrors the server check in it-kanban-routes, which is the real gate.
 */
export const canDeleteTickets = (user) => {
  const role = String(user?.role || user?.role_name || '').toLowerCase();
  return role.includes('manager') || role.includes('admin');
};

/**
 * Identifies the signed-in user to the server (x-user-id), so it can look up their role
 * itself — used for deletes and for approving performance points.
 */
export const ticketDeleteHeaders = (user) => {
  const headers = {};
  const u = user || (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { return null; }
  })();
  const id = u?.id || u?.userId;
  if (id) headers['x-user-id'] = String(id);
  return headers;
};

export const TICKET_DELETE_DENIED_MESSAGE = 'Only managers can delete tickets.';

/**
 * Managers and admins may change what decides a task's worth and timing once work has
 * started (planned time, priority, type, labels, points, dates, owner of a finished task).
 * Matches the server's rule (middleware/session.js roleIsManager), which is what enforces it.
 */
export const isManagerUser = (user) => {
  const role = String(user?.role || user?.role_name || '').toLowerCase();
  return role.includes('manager') || role.includes('admin');
};

// Statuses in which work hasn't started yet; after these, size fields lock for non-managers.
export const NOT_STARTED_STATUSES = ['', 'TO DO', 'TODO', 'BACKLOG', 'OPEN', 'NEW'];
export const hasWorkStarted = (status) => !NOT_STARTED_STATUSES.includes(String(status || '').trim().toUpperCase());

export default isManagerDesignation;

