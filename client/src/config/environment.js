const isBrowser = typeof window !== 'undefined';
const isRemote = isBrowser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// In browser on production/live domains (e.g. allinonecrm.codigixinfotech.com), always derive baseUrl and apiUrl
// dynamically from window.location.origin so static assets (/uploads) and APIs (/api) resolve to the active host.
const API_URL = isRemote
  ? `${window.location.origin}/api`
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

const BASE_URL = isRemote
  ? window.location.origin
  : API_URL.replace(/\/api\/?$/, '');

export const environment = {
  production: process.env.REACT_APP_ENV === 'production' || isRemote,
  development: process.env.REACT_APP_ENV !== 'production' && !isRemote,
  debug: process.env.REACT_APP_DEBUG === 'true',
  apiUrl: API_URL,
  baseUrl: BASE_URL,
};

export const API_BASE_URL = API_URL;
export const BASE_SERVER_URL = BASE_URL;

export const getApiUrl = (endpoint) => {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) return endpoint;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_URL}${cleanEndpoint}`;
};

export default environment;
