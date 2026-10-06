import React, {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import { SecureStorage } from "@/utils/secureStorage";
import { requestReauthentication, REAUTHENTICATION_REQUIRED_EVENT } from "@/utils/authSessionRecovery";
import { AUTH_INITIAL_FAILURE_GRACE_MS, AUTH_RETRY_INITIAL_DELAY_MS, AUTH_RETRY_MAX_DELAY_MS } from "@/utils/authConnectionRecovery";
import { paymeService } from "@/services/payme.service";
import { toast } from "@/utils/toast";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import { closeStudentPresenceBeforeLogout } from "@/services/studentPresence.service";

interface User {
  id?: string;
  userName?: string;
  username?: string;
  name: string;
  avatarUrl?: string;
  avatar?: string;
  phoneNumber?: string;
  createdAt?: string;
  balance?: number;
  coin?: number;
  currentOverallTestId?: string | null;
  accountType?: "STUDENT" | "TEACHER" | "INSTITUTION";
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authIssue, setAuthIssue] = useState(false);
  const [checking, setChecking] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [initialIssueVisible, setInitialIssueVisible] = useState(false);
  const authenticatedRef = useRef(false);
  const processingLoginRef = useRef(false);
  const authOperationRef = useRef(0);
  const authIssueRef = useRef(false);
  const retryDelayRef = useRef(AUTH_RETRY_INITIAL_DELAY_MS);
  const invalidateAuthOperation = useCallback(() => { ++authOperationRef.current; }, []);
  const autoPurchaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPurchaseInFlightRef = useRef(false);
  const pendingPurchaseStorageKey = "tm_pending_credit_purchase_v1";

  const refreshUser = useCallback(async (manualRetry = false) => {
    if (manualRetry) {
      setRetryFailed(false);
      retryDelayRef.current = AUTH_RETRY_INITIAL_DELAY_MS;
    }
    const operation = ++authOperationRef.current;
    const { accessToken, refreshToken } = authService.getStoredTokens();
    if (!accessToken && !refreshToken) {
      authenticatedRef.current = false;
      authIssueRef.current = false;
      setAuthIssue(false);
      setRetryFailed(false);
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    if (!authenticatedRef.current) setIsLoading(true);
    try {
      // The API client renews expired access tokens before rejecting the login.
      const userData = await authService.getCurrentUser();
      if (operation !== authOperationRef.current) return;
      if (!userData) throw new Error("Hesap bilgisi alınamadı.");
      authenticatedRef.current = true;
      authIssueRef.current = false;
      setUser(userData as unknown as User);
      setIsAuthenticated(true);
      setAuthIssue(false);
      setRetryFailed(false);
      const userId = userData.id ?? userData.userId;
      if (userId) {
        SecureStorage.setSessionItem("userId", String(userId));
        window.dispatchEvent(new Event('auth:access-context'));
      }
    } catch (error) {
      if (operation !== authOperationRef.current) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        requestReauthentication();
      } else {
        // Do not turn an outage, timeout or server error into a logout.
        // On initial load, wait for confirmation rather than granting access.
        authIssueRef.current = true;
        setAuthIssue(true);
        if (manualRetry) setRetryFailed(true);
      }
    } finally {
      if (operation === authOperationRef.current) {
        setIsLoading(false);
        setChecking(false);
      }
    }
  }, []);

  const login = async (accessToken: string, refreshToken?: string) => {
    if (processingLoginRef.current) return;
    processingLoginRef.current = true;
    try {
      authService.storeTokens(accessToken, refreshToken);
      await refreshUser();
    } finally {
      processingLoginRef.current = false;
    }
  };

  const logout = () => {
    closeStudentPresenceBeforeLogout();
    ++authOperationRef.current;
    authenticatedRef.current = false;
    authIssueRef.current = false;
    authService.clearStoredTokens();
    setUser(null);
    setIsAuthenticated(false);
    setAuthIssue(false);
    setRetryFailed(false);
    setIsLoading(false);
    setChecking(false);
  };

  useEffect(() => {
    const handler = () => { void refreshUser(); };
    const reauthenticationHandler = () => {
      ++authOperationRef.current;
      authenticatedRef.current = false;
      authIssueRef.current = false;
      setUser(null);
      setIsAuthenticated(false);
      setAuthIssue(false);
      setRetryFailed(false);
      setIsLoading(false);
      setChecking(false);
    };
    const userHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as User | undefined;
      if (detail) {
        if (detail.id) {
          SecureStorage.setSessionItem("userId", detail.id);
          window.dispatchEvent(new Event('auth:access-context'));
        }
        ++authOperationRef.current;
        authenticatedRef.current = true;
        authIssueRef.current = false;
        setUser(detail);
        setIsAuthenticated(true);
        setAuthIssue(false);
        setRetryFailed(false);
        setIsLoading(false);
        setChecking(false);
      } else {
        void refreshUser();
      }
    };
    const retryWhenOnline = () => {
      if (authIssueRef.current) void refreshUser();
    };
    const retryWhenVisible = () => {
      if (document.visibilityState === "visible") retryWhenOnline();
    };
    window.addEventListener("auth:tokens", handler);
    window.addEventListener(REAUTHENTICATION_REQUIRED_EVENT, reauthenticationHandler);
    window.addEventListener("auth:user", userHandler);
    window.addEventListener("online", retryWhenOnline);
    document.addEventListener("visibilitychange", retryWhenVisible);
    void refreshUser();
    return () => {
      invalidateAuthOperation();
      window.removeEventListener("auth:tokens", handler);
      window.removeEventListener(REAUTHENTICATION_REQUIRED_EVENT, reauthenticationHandler);
      window.removeEventListener("auth:user", userHandler);
      window.removeEventListener("online", retryWhenOnline);
      document.removeEventListener("visibilitychange", retryWhenVisible);
    };
  }, [refreshUser, invalidateAuthOperation]);

  useEffect(() => {
    if (!authIssue) {
      retryDelayRef.current = AUTH_RETRY_INITIAL_DELAY_MS;
      return;
    }
    if (checking) return;
    const timer = window.setTimeout(() => {
      if (!authIssueRef.current || document.visibilityState !== "visible" || navigator.onLine === false) return;
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, AUTH_RETRY_MAX_DELAY_MS);
      void refreshUser();
    }, retryDelayRef.current);
    return () => window.clearTimeout(timer);
  }, [authIssue, checking, refreshUser]);

  useEffect(() => {
    if (!authIssue || isAuthenticated) {
      setInitialIssueVisible(false);
      return;
    }
    // A brief API restart should stay a loading state, not flash an outage page.
    const timer = window.setTimeout(() => setInitialIssueVisible(true), AUTH_INITIAL_FAILURE_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [authIssue, isAuthenticated]);

  useEffect(() => {
    if (isSubscriptionBillingEnabled) return;
    if (!isAuthenticated) {
      if (autoPurchaseIntervalRef.current) {
        clearInterval(autoPurchaseIntervalRef.current);
        autoPurchaseIntervalRef.current = null;
      }
      return;
    }

    const runAutoFinalize = async () => {
      if (autoPurchaseInFlightRef.current) return;
      if (typeof window === "undefined") return;

      const raw = window.localStorage.getItem(pendingPurchaseStorageKey);
      if (!raw) return;

      let pending: { planId?: string; units?: number; createdAt?: number } | null = null;
      try {
        pending = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem(pendingPurchaseStorageKey);
        return;
      }

      const units = Math.floor(Number(pending?.units || 0));
      const planId = String(pending?.planId || "quick");
      const createdAt = Number(pending?.createdAt || 0);
      const isStale = createdAt > 0 && Date.now() - createdAt > 60 * 60 * 1000;

      if (units <= 0 || isStale) {
        window.localStorage.removeItem(pendingPurchaseStorageKey);
        return;
      }

      autoPurchaseInFlightRef.current = true;
      try {
        const result = await paymeService.checkoutProductSingleFlow(planId, units);
        if (result?.status !== "COMPLETED") return;

        window.localStorage.removeItem(pendingPurchaseStorageKey);
        await refreshUser().catch(() => undefined);
        toast.success(`${units} kredi otomatik olarak hesabınıza yüklendi.`);
      } catch {
        // Keep pending key and retry in next interval.
      } finally {
        autoPurchaseInFlightRef.current = false;
      }
    };

    void runAutoFinalize();
    autoPurchaseIntervalRef.current = setInterval(() => {
      void runAutoFinalize();
    }, 5000);

    return () => {
      if (autoPurchaseIntervalRef.current) {
        clearInterval(autoPurchaseIntervalRef.current);
        autoPurchaseIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, refreshUser]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {authIssue && !isAuthenticated ? (
        <main className="flex min-h-screen items-center justify-center bg-[var(--tm-bg-page)] px-6">
          <div role={initialIssueVisible ? "alert" : "status"} className="max-w-sm text-center">
            {initialIssueVisible ? <>
            <h1 className="text-lg font-semibold text-[var(--tm-text-primary)]">Hesabınıza şu anda ulaşılamıyor.</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
              Oturumunuz silinmedi. Bağlantı kurulunca kaldığınız yerden devam edebilirsiniz.
            </p>
            <button type="button" disabled={checking} onClick={() => void refreshUser(true)}
              className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {checking ? "Kontrol ediliyor…" : "Tekrar dene"}
            </button>
            <p role="status" aria-live="polite" className="mt-3 text-xs leading-5 text-[var(--tm-text-secondary)]">
              {retryFailed ? "Bağlantı hâlâ kurulamadı. Otomatik olarak yeniden deneyeceğiz." : "Bağlantı otomatik olarak yeniden denenecek."}
            </p>
            </> : <div className="flex items-center gap-2 text-sm text-[var(--tm-text-secondary)]">
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Hesabınıza bağlanılıyor…
            </div>}
          </div>
        </main>
      ) : children}
      {authIssue && isAuthenticated ? (
        <div role="alert" className="fixed bottom-6 left-1/2 z-[100] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-4 rounded-lg border border-[var(--tm-border-subtle)] bg-white px-4 py-3 shadow-lg">
          <p role="status" aria-live="polite" className="flex-1 text-sm leading-5 text-[var(--tm-text-secondary)]">
            {retryFailed ? "Bağlantı hâlâ kurulamadı." : "Hesap bağlantısı kurulamadı."} Oturumunuz ve çalışmanız korunuyor. Otomatik olarak yeniden deneyeceğiz.
          </p>
          <button type="button" disabled={checking} onClick={() => void refreshUser(true)}
            className="shrink-0 text-sm font-semibold text-red-700 disabled:opacity-50">
            {checking ? "Kontrol ediliyor…" : "Tekrar dene"}
          </button>
        </div>
      ) : null}
    </AuthContext.Provider>
  );
};
