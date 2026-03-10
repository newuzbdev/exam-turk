import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import { SecureStorage } from "@/utils/secureStorage";
import { paymeService } from "@/services/payme.service";
import { toast } from "@/utils/toast";

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
  const [isProcessingLogin, setIsProcessingLogin] = useState(false);
  const autoPurchaseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoPurchaseInFlightRef = useRef(false);
  const pendingPurchaseStorageKey = "tm_pending_credit_purchase_v1";

  const login = async (accessToken: string, refreshToken?: string) => {
    // Prevent multiple simultaneous login attempts
    if (isProcessingLogin) {
      console.log("Login already in progress, skipping...");
      return;
    }

    setIsProcessingLogin(true);
    try {
      console.log("Starting login process...");
      // Store tokens securely
      authService.storeTokens(accessToken, refreshToken);

      // Fetch user data
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);

        // Store user ID if available
        if (userData.id) {
          SecureStorage.setSessionItem("userId", userData.id);
        }
        console.log("Login completed successfully");
      }
    } catch (error) {
      console.error("Error during login:", error);
      logout();
    } finally {
      setIsProcessingLogin(false);
    }
  };

  const logout = () => {
    authService.clearStoredTokens();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      logout();
    }
  };

  const checkAuth = async () => {
    // Don't check auth if login is already in progress
    if (isProcessingLogin) {
      console.log("Login in progress, skipping auth check...");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    const { accessToken } = authService.getStoredTokens();
    
    // Debug token status
    console.log('🔍 Auth check - Token status:', {
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'No token',
      isExpired: accessToken ? authService.isTokenExpired(accessToken) : 'No token'
    });
    
    // Only clean up tokens if they are actually expired
    if (accessToken && authService.isTokenExpired(accessToken)) {
      console.log('Token expired, cleaning up...');
      authService.cleanupExpiredTokens();
    }

    if (accessToken) {
      try {
        console.log("Checking existing auth...");
        const userData = await authService.getCurrentUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);

          // Store user ID if available and not already stored
          if (userData.id && !SecureStorage.getSessionItem("userId")) {
            SecureStorage.setSessionItem("userId", userData.id);
          }
          console.log("Auth check completed successfully");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        logout();
      }
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    checkAuth();
    // Listen for token changes to refresh user
    const handler = () => {
      refreshUser();
    };
    // Listen for direct user payload after signup
    const userHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as any;
      if (detail) {
        setUser(detail);
        setIsAuthenticated(true);
      } else {
        refreshUser();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("auth:tokens", handler);
      window.addEventListener("auth:user", userHandler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("auth:tokens", handler);
        window.removeEventListener("auth:user", userHandler as EventListener);
      }
    };
  }, []);

  useEffect(() => {
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
        toast.success(`${units} kredi otomatik olarak hesabiniza yuklendi.`);
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
  }, [isAuthenticated]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
