import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { cookieAuthService } from "@/services/cookieAuth.service";

interface User {
  id?: string;
  userName?: string;
  name?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
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

export const CookieAuthProvider: React.FC<AuthProviderProps> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Login function - no token parameters needed (handled by HttpOnly cookies)
  const login = async () => {
    try {
      console.log("Checking authentication via HttpOnly cookies...");
      const { isAuthenticated: authStatus, user: userData } =
        await cookieAuthService.checkAuth();

      if (authStatus && userData) {
        setUser(userData);
        setIsAuthenticated(true);
        console.log("Authentication successful via cookies");
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log("Authentication failed");
      }
    } catch (error) {
      console.error("Error during login check:", error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // This will call the backend to clear HttpOnly cookies
      await cookieAuthService.logout((path) => {
        // Navigation is handled by the service
        window.location.href = path;
      });

      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Error during logout:", error);
      // Clear local state even if backend call fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const userData = await cookieAuthService.getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Check authentication on app load
  const checkAuth = async () => {
    setIsLoading(true);

    try {
      console.log("Checking authentication status...");
      const { isAuthenticated: authStatus, user: userData } =
        await cookieAuthService.checkAuth();

      if (authStatus && userData) {
        setUser(userData);
        setIsAuthenticated(true);
        console.log("User is authenticated via HttpOnly cookies");
      } else {
        setUser(null);
        setIsAuthenticated(false);
        console.log("User is not authenticated");
      }
    } catch (error) {
      console.error("Error checking auth:", error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Check auth on component mount
  useEffect(() => {
    checkAuth();
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
