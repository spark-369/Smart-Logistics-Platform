import axios from 'axios';

/**
 * Base URL resolution order:
 *  1. VITE_API_URL (explicit override, used by Docker/CI builds)
 *  2. "" (same origin) in production builds - Nginx proxies /api to the backend
 *  3. the Vite dev-server proxy in development (see vite.config.js)
 *
 * Never hardcode localhost: it breaks Docker, preview builds and any non-local deployment.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/** Requests that must NOT trigger a redirect when they fail with 401/403. */
const AUTH_ENDPOINTS = ['/api/auth/login', '/api/auth/register'];

/**
 * Endpoints where a 403 means "this action is not permitted", not "your session is invalid".
 *
 * The backend uses 403 for business-rule rejections as well as for missing roles, so a blanket
 * redirect on 403 used to yank users off the page mid-edit (e.g. while creating a shipment) and
 * lose their form input. Those calls now surface the error in place instead.
 */
const IN_PLACE_FORBIDDEN_ENDPOINTS = ['/api/shipments', '/api/tracking'];

export const TOKEN_STORAGE_KEY = 'slp.token';
export const USER_STORAGE_KEY = 'slp.user';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url ?? '';
    const isAuthCall = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
    const handleInPlace = IN_PLACE_FORBIDDEN_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    // A failed login must surface on the form, not bounce the page to /login.
    if (isAuthCall) {
      return Promise.reject(error);
    }

    if (status === 401) {
      // The token is missing, expired or rejected: clear the session and return to sign in.
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    } else if (status === 403 && !handleInPlace) {
      if (window.location.pathname !== '/unauthorized') {
        window.location.assign('/unauthorized');
      }
    }

    return Promise.reject(error);
  },
);

export default api;

