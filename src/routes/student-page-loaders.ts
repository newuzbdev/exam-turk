// Share these imports with React.lazy so menu intent warms the exact route chunk.
// No API requests, session admission or exam work happens here.
export const studentPageLoaders = {
  dashboard: () => import('@/pages/dashboard/student-dashboard'),
  practice: () => import('@/pages/reading-practice/PracticeHome'),
  mock: () => import('@/pages/test/test'),
  reports: () => import('@/pages/results/ReportsPage'),
};

export function preloadStudentPage(pathname: string) {
  const load = pathname === '/app' ? studentPageLoaders.dashboard
    : pathname === '/app/pratik' ? studentPageLoaders.practice
    : pathname === '/app/test' ? studentPageLoaders.mock
    : pathname === '/app/sonuclar' ? studentPageLoaders.reports : null;
  // Navigation keeps the existing explicit error-recovery flow if a chunk fails.
  if (load) void load().catch(() => undefined);
}
