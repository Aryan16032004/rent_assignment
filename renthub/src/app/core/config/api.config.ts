export const API_BASE_URL = 'http://localhost:3000/api';
export const SERVER_BASE_URL = 'http://localhost:3000';

export function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
