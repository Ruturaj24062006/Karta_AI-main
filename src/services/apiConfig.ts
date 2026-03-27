/**
 * KARTA API Config — Central Axios instance
 * All API calls go through this file.
 * Base URL reads from env VITE_API_URL.
 */
import axios from 'axios';
import { getAuthToken } from './auth';

export const BASE_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`;
export const WS_API_URL = BASE_URL.replace(/^http/i, 'ws');

// WebSocket goes through the Vite proxy (same origin = port 5173 in dev)
// so browsers don't block the cross-port WS upgrade handshake.
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_URL = `${wsProtocol}//${window.location.host}`;

// ─── Global Axios Instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s for heavy ML endpoints
  headers: { 'Accept': 'application/json' },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Stamp every request with a start time for timing logs
    (config as any)._startTime = Date.now();
    const token = getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const elapsed = Date.now() - ((response.config as any)._startTime || Date.now());
    console.debug(`[KARTA API] ${response.config.method?.toUpperCase()} ${response.config.url} → ${response.status} (${elapsed}ms)`);
    return response;
  },
  (error) => {
    const status  = error.response?.status;
    const detail  = error.response?.data?.detail || error.message || 'Unknown server error';
    const url     = error.config?.url || '';

    console.error(`[KARTA API ERROR] ${url} → ${status}: ${detail}`);

    // Enrich error so UI components can read .userMessage directly
    error.userMessage =
      status === 0       ? `Cannot reach KARTA backend at ${BASE_URL}.` :
      status === 400     ? `Bad request: ${detail}` :
      status === 404     ? `Not found: ${detail}` :
      status === 422     ? `Validation error: ${detail}` :
      status === 500     ? `Server error: ${detail}` :
                           `Error (${status}): ${detail}`;

    return Promise.reject(error);
  }
);

export default api;
