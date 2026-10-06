export const LEGACY_STUDENT_ROOTS = [
  'dersler', 'pratik', 'test', 'reading-test', 'listening-test', 'writing-test',
  'speaking-test', 'speaking-demo', 'overall-section-ready', 'overall-results',
  'unified-results', 'test-unified-results', 'test-payme',
] as const;

export function studentPath(pathname: string): string | null {
  if (pathname === '/app' || pathname.startsWith('/app/')) return pathname;
  if (pathname === '/') return '/app';
  if (pathname === '/profile') return '/app/profil';
  if (pathname === '/price') return '/app/fiyatlar';
  if (pathname === '/how-it-works') return '/app/nasil-calisir';
  if (LEGACY_STUDENT_ROOTS.some(root => pathname === `/${root}` || pathname.startsWith(`/${root}/`))) return `/app${pathname}`;
  return null;
}

export function isActiveStudentExam(pathname: string): boolean {
  const path = studentPath(pathname) ?? pathname;
  if (path === '/app/overall-section-ready') return true;
  return /^\/app\/(reading|listening|writing|speaking)-test\/(?!results(?:\/|$))[^/]+(?:\/part\/[^/]+)?\/?$/.test(path);
}
