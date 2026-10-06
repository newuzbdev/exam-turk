import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { studentPath } from './student-route-paths';
import { captureAccessLink } from '@/utils/access-link-context';

export function GuestOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <main role="status">Hesabın hazırlanıyor...</main>;
  // Login owns the saved destination. Do not unmount it when auth changes:
  // its success handler/effect must route to the card the user selected.
  if (location.pathname === '/login') return <>{children}</>;
  if (isAuthenticated) return <Navigate to={`${studentPath(location.pathname) ?? '/app'}${location.search}${location.hash}`} state={location.state} replace />;
  return <>{children}</>;
}

export function LegacyStudentRedirect() {
  const location = useLocation();
  const { safeReturnTo } = captureAccessLink(location);
  return <Navigate to={safeReturnTo} state={location.state} replace />;
}
