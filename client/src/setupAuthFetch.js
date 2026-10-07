/**
 * Sends the login session cookie with every API request and handles an expired session.
 *
 * The server keeps the session in an httpOnly cookie (it cannot be read by page scripts).
 * In development the app (port 3000) and API (port 5000) are different origins, and
 * fetch/axios only send cookies cross-origin when asked to — so this turns that on for API
 * calls, in one place, instead of in each of the app's hundreds of fetch calls.
 *
 * Imported first in index.js so it is in place before any component makes a request.
 */
import axios from 'axios';
import { API_BASE_URL } from './config/environment';

const PUBLIC_PAGES = ['/', '/landing', '/login', '/signup', '/sso-login'];
const SESSION_CODES = ['NOT_AUTHENTICATED', 'SESSION_EXPIRED', 'ACCOUNT_INACTIVE'];

const apiOrigin = (() => {
  try { return new URL(API_BASE_URL, window.location.origin); } catch (e) { return null; }
})();

const isApiUrl = (url) => {
  try {
    const u = new URL(url, window.location.origin);
    if (u.pathname.startsWith('/api/') && u.origin === window.location.origin) return true;
    return Boolean(apiOrigin) && u.origin === apiOrigin.origin && u.pathname.startsWith(apiOrigin.pathname);
  } catch (e) {
    return false;
  }
};

let redirecting = false;
const handleSessionLost = (code) => {
  if (redirecting || PUBLIC_PAGES.includes(window.location.pathname)) return;
  redirecting = true;
  try {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    if (code === 'SESSION_EXPIRED' || code === 'ACCOUNT_INACTIVE') {
      sessionStorage.setItem('loginNotice', code);
    }
  } catch (e) { /* storage unavailable */ }
  window.location.assign('/login');
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  if (!isApiUrl(url)) return originalFetch(input, init);

  const response = await originalFetch(input, { credentials: 'include', ...init });
  if (response.status === 401 && !url.includes('/auth/login')) {
    response.clone().json()
      .then(body => { if (SESSION_CODES.includes(body?.code)) handleSessionLost(body.code); })
      .catch(() => { });
  }
  return response;
};

axios.defaults.withCredentials = true;
axios.interceptors.response.use(
  (res) => res,
  (error) => {
    const code = error?.response?.data?.code;
    if (error?.response?.status === 401 && SESSION_CODES.includes(code)) handleSessionLost(code);
    return Promise.reject(error);
  }
);
