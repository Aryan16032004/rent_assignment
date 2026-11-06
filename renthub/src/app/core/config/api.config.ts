function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    if (
      window.location.port !== '4200' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return '/api';
    }
  }
  return 'http://localhost:3000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
export const SERVER_BASE_URL = API_BASE_URL.startsWith('http') ? 'http://localhost:3000' : '';

export function resolveImageUrl(url: string): string {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) {
    return url;
  }
  return `${SERVER_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}
