const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace(/\/api\/?$/, '');

export const environment = {
  production: process.env.REACT_APP_ENV === 'production',
  development: process.env.REACT_APP_ENV !== 'production',
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
