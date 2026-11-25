export function apiRequestUrl(rawUrl) {
  const url = new URL(rawUrl, 'http://localhost');
  const path = url.searchParams.get('__osudh_path');
  if (path === null) return rawUrl;
  url.searchParams.delete('__osudh_path');
  // Invalid captures reach the normal JSON 404 handler, never the SPA.
  if (path.length > 512 || !/^[A-Za-z0-9_./-]*$/.test(path) || path.split('/').some(part => part === '.' || part === '..')) {
    return '/api/invalid-route';
  }
  return `/api/${path}${url.search}`;
}
