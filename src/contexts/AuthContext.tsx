import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import { SecureStorage } from "@/utils/secureStorage";

interface User {
  id?: string;
  userName?: string;
  name: string;
  avatarUrl?: string;
  avatar?: string;
  phoneNumber?: string;
  createdAt?: string;
  balance?: number;
  coin?: number;
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
