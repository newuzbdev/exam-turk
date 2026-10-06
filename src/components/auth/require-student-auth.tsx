import { Navigate, Outlet, useLocation } from "react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { captureAccessLink } from '@/utils/access-link-context';

export default function RequireStudentAuth() {
  const location = useLocation();
  const { safeReturnTo } = captureAccessLink(location);
  const { isAuthenticated, isLoading } = useAuth();
  if (new URLSearchParams(location.search).has('share')) return <Navigate to={safeReturnTo} replace state={location.state} />;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-page)]">
        <div className="flex items-center gap-2 text-sm text-[var(--tm-text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Hesabın hazırlanıyor...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    const redirectTo = safeReturnTo;
    return (
      <Navigate
        to="/login"
        replace
        state={{ mode: "login", redirectTo }}
      />
    );
  }

  return <Outlet />;
}
