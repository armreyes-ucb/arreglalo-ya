export const API_URL = 'http://localhost:3000';

export function resolverImagen(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }
  return url;
}
