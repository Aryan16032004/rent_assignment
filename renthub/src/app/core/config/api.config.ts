import { environment } from '../../../environments/environment';

/**
 * RentHub API & Asset Configuration
 * Connects seamlessly to the deployed backend on Vercel by default,
 * while allowing local override if needed.
 */

function resolveApiBaseUrl(): string {
  if (environment.apiBaseUrl && environment.apiBaseUrl.startsWith('http')) {
    return environment.apiBaseUrl;
  }
  return 'https://renthub-backend-kappa.vercel.app/api';
}

/** Global API base URL used across all Angular HTTP services */
export const API_BASE_URL = resolveApiBaseUrl();

/** Root server URL without the `/api` path (used to resolve relative uploads) */
export const SERVER_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * Normalizes an image URL for display.
 * - Preserves absolute HTTPS URLs (Cloudinary, Unsplash, external CDNs).
 * - Preserves data URIs and blob URLs from client-side file previews.
 * - Prefixes relative upload paths with the active backend server URL.
 */
export function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
