export const LEGACY_STUDENT_ROOTS = [
  'dersler', 'pratik', 'test', 'reading-test', 'listening-test', 'writing-test',
  'speaking-test', 'speaking-demo', 'overall-section-ready', 'overall-results',
  'unified-results', 'test-unified-results', 'test-payme',
] as const;

export function studentPath(pathname: string): string | null {
  if (pathname === '/how-it-works' || pathname === '/app/nasil-calisir') return '/app';
  // Retain old bookmarks while retired screens stay out of the application.
  const retiredPath = pathname.replace(/^\/app(?=\/)/, '').replace(/\/$/, '');
  if (retiredPath === '/speaking-demo') return '/app/test';
  if (retiredPath === '/test-unified-results' || retiredPath === '/unified-results') return '/app/sonuclar';
  const retiredResult = /^\/unified-results\/([^/]+)$/.exec(retiredPath);
  if (retiredResult) return `/app/overall-results/${retiredResult[1]}`;
  if (pathname === '/app' || pathname.startsWith('/app/')) return pathname;
  if (pathname === '/') return '/app';
  if (pathname === '/profile') return '/app/profil';
  if (pathname === '/price') return '/app/fiyatlar';
  if (LEGACY_STUDENT_ROOTS.some(root => pathname === `/${root}` || pathname.startsWith(`/${root}/`))) return `/app${pathname}`;
  return null;
}

export function isActiveStudentExam(pathname: string): boolean {
  const path = studentPath(pathname) ?? pathname;
  if (path === '/app/overall-section-ready') return true;
  return /^\/app\/(reading|listening|writing|speaking)-test\/(?!results(?:\/|$))[^/]+(?:\/part\/[^/]+)?\/?$/.test(path);
}
