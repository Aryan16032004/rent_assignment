import { environment } from '../../../environments/environment';

/**
 * RentHub API & Asset Configuration
 * Resolves API endpoints dynamically based on the execution context (production vs local development).
 */

/**
 * Resolves the primary base URL for backend API requests.
 * - In production deployment on Vercel: returns `https://renthub-backend-kappa.vercel.app/api`.
 * - In local browser development (`localhost:4200`): returns `http://localhost:3000/api`.
 * - In unit test runner: defaults to `http://localhost:3000/api`.
 *
 * @returns Fully qualified API base URL
 */
function resolveApiBaseUrl(): string {
  // If explicitly configured in the environment (e.g., environment.prod.ts via fileReplacements)
  if (environment.apiBaseUrl && environment.apiBaseUrl.startsWith('http')) {
    // If running in browser on localhost:4200, preserve local development backend server
    if (
      typeof window !== 'undefined' &&
      window.location &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ) {
      return 'http://localhost:3000/api';
    }
    return environment.apiBaseUrl;
  }

  // Runtime fallback when deployed on remote host (e.g., Vercel frontend)
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

/** Global API base URL used across all Angular HTTP services */
export const API_BASE_URL = resolveApiBaseUrl();

/** Root server URL without the `/api` path (used to resolve relative uploads) */
export const SERVER_BASE_URL =
  API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:3000';

/**
 * Normalizes an image URL for display.
 * - Preserves absolute HTTPS URLs (Cloudinary, Unsplash, external CDNs).
 * - Preserves data URIs and blob URLs from client-side file previews.
 * - Prefixes relative upload paths with the active backend server URL.
 *
 * @param url - Raw image path or absolute URL
 * @returns Fully resolved image URL
 */
export function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
