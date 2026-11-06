import { environment } from '../../../environments/environment';

function resolveApiBaseUrl(): string {
  // If explicitly configured in the environment (e.g. production build)
  if (environment.apiBaseUrl && environment.apiBaseUrl.startsWith('http')) {
    // If running in browser and on localhost:4200, preserve local development backend
    if (
      typeof window !== 'undefined' &&
      window.location &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      return 'http://localhost:3000/api';
    }
    return environment.apiBaseUrl;
  }

  // Runtime fallback when deployed on remote host (e.g. Vercel)
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return 'https://renthub-backend-kappa.vercel.app/api';
  }

  return 'http://localhost:3000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const SERVER_BASE_URL =
  API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:3000';

export function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
