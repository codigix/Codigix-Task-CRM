// Builds the signed-in user's own route segment, e.g. "/marketing/graphics-designer/gusingekaran1220".
// Notifications and emails can't store this server-side because each recipient has a different path.
export const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

export const userWorkspacePath = (user) => {
  if (!user) return null;
  const dept = String(user.department || '').toLowerCase();
  const role = String(user.role || '').toLowerCase();

  let prefix = '';
  if (dept.includes('marketing') || role.includes('marketing')) prefix = '/marketing';
  else if (dept.includes('it') || role.includes('it') || role.includes('developer') || role.includes('tester')) prefix = '/it';
  else if (dept.includes('seo') || dept.includes('gmb')) prefix = '/seo-gmb';
  else if (dept.includes('sales') || dept.includes('lead') || dept.includes('deal')) prefix = '/sales';
  else if (dept.includes('hr') || role.includes('hr') || dept.includes('management')) prefix = '/hr';
  if (!prefix) return null;

  const designation = slug(user.role) || 'employee';
  const username = slug(user.username || user.first_name || 'user');
  return `${prefix}/${designation}/${username}`;
};

// A link opened while signed out (e.g. from an email) is remembered so login can continue to it.
const AFTER_LOGIN_KEY = 'crm_after_login';

export const rememberAfterLogin = (path) => {
  try { sessionStorage.setItem(AFTER_LOGIN_KEY, path); } catch { /* storage blocked: login goes to the dashboard */ }
};

export const takeAfterLogin = () => {
  try {
    const path = sessionStorage.getItem(AFTER_LOGIN_KEY);
    sessionStorage.removeItem(AFTER_LOGIN_KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch { return null; }
};
