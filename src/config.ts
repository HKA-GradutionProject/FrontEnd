export const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL || 'https://backend-production-8600.up.railway.app';

export function getWebSocketUrl(path: string) {
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}${path}`;
  }

  const explicitWebSocketBaseUrl = import.meta.env.VITE_WS_BASE_URL;
  if (explicitWebSocketBaseUrl) {
    return `${explicitWebSocketBaseUrl}${path}`;
  }

  return `${API_BASE_URL.replace(/^http/, 'ws')}${path}`;
}
