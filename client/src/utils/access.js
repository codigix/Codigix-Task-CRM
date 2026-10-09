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
export const isManagerDesignation = (designation, user) => {
  const d = String(designation || '').toLowerCase();
  const u = user || (() => {
    try { return JSON.parse(localStorage.getItem('currentUser') || 'null'); } catch (e) { return null; }
  })();
  const role = String(u?.role || u?.role_name || '').toLowerCase();
  const deptRole = String(u?.department_role || '').toLowerCase();
  if (role.includes('manager') || role.includes('admin') || deptRole === 'manager') return true;

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
  const role = String(user?.role || user?.role_name || '').toLowerCase();
  const dept = String(user?.department || '').toLowerCase();
  const deptRole = String(user?.department_role || '').toLowerCase();

  const isPrivileged = (
    deptRole === 'manager' ||
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
  const deptRole = String(user?.department_role || '').toLowerCase();
  return role.includes('manager') || role.includes('admin') || deptRole === 'manager';
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
  const deptRole = String(user?.department_role || '').toLowerCase();
  const jobTitle = String(user?.job_title || '').toLowerCase();
  const email = String(user?.email || '').toLowerCase();
  return role.includes('manager') || role.includes('admin') || deptRole === 'manager' || jobTitle.includes('manager') || email === 'sonalicodigix@gmail.com';
};

// Statuses in which work hasn't started yet; after these, size fields lock for non-managers.
export const NOT_STARTED_STATUSES = ['', 'TO DO', 'TODO', 'BACKLOG', 'OPEN', 'NEW'];
export const hasWorkStarted = (status) => !NOT_STARTED_STATUSES.includes(String(status || '').trim().toUpperCase());

/**
 * Only the reporter of a task is allowed to mark it as Done.
 * Checks whether the current user matches the task's reporter.
 */
export const isUserTaskReporter = (reporter, user, myIdentities = []) => {
  if (!reporter) return false;
  const rep = String(typeof reporter === 'object' ? reporter.name || '' : reporter || '').trim().toLowerCase();
  if (!rep || rep === 'unassigned') return false;

  const identities = new Set((myIdentities || []).map(id => String(id || '').trim().toLowerCase()));

  if (user) {
    if (user.username) identities.add(String(user.username).trim().toLowerCase());
    if (user.email) identities.add(String(user.email).trim().toLowerCase());
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
    if (fullName) identities.add(fullName);
    if (user.name) identities.add(String(user.name).trim().toLowerCase());
    if (user.first_name) identities.add(String(user.first_name).trim().toLowerCase());
  }

  for (const id of identities) {
    if (!id) continue;
    if (id === rep || rep === id || rep.includes(id) || id.includes(rep)) {
      return true;
    }
  }
  return false;
};

export default isManagerDesignation;


