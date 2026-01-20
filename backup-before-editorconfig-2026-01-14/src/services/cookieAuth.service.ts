import axiosPrivate from "@/config/api";
import { authEndPoint } from "@/config/endpoint";
import { toast } from "@/utils/toast";

export interface LoginCredentials {
  name: string;
  password: string;
}

export interface RegisterData {
  name: string;
  password: string;
  phoneNumber: string;
  userName: string;
  avatarUrl?: string;
}

export interface AuthResult {
  success: boolean;
  shouldNavigate?: boolean;
  shouldRedirectToLogin?: boolean;
}

// Cookie-based authentication service (no client-side token storage)
export const cookieAuthService = {
  // Format phone number helper
  formatPhoneNumber: (phone: string): string => {
    const cleanPhone = phone.replace(/[\s+]/g, "");
    let phoneWithPrefix = cleanPhone;

    if (phoneWithPrefix.startsWith("+998")) {
      phoneWithPrefix = phoneWithPrefix.substring(1);
    } else if (phoneWithPrefix.startsWith("998")) {
      phoneWithPrefix = phoneWithPrefix;
    } else {
      phoneWithPrefix = `998${phoneWithPrefix}`;
    }

    return phoneWithPrefix;
  },

  // Get current user data (tokens handled by HttpOnly cookies)
  getCurrentUser: async (): Promise<any> => {
    try {
      console.log("Fetching user data (tokens via HttpOnly cookies)...");
      const response = await axiosPrivate.get(authEndPoint.me);
      console.log("User data received:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  },

  // Login with credentials (backend sets HttpOnly cookies)
  loginWithCredentials: async (
    credentials: LoginCredentials,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const response = await axiosPrivate.post(authEndPoint.login, credentials);

      if (response.data.success || response.status === 200) {
        // Backend should set HttpOnly cookies automatically
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      } else {
        toast.error("Giriş başarısız");
        return { success: false };
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Giriş başarısız");
      return { success: false };
    }
  },

  // Google OAuth login (backend handles token storage)
  handleGoogleOAuth: async (
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      // Backend should have already set HttpOnly cookies during OAuth callback
      // Just verify authentication by fetching user data
      const userData = await cookieAuthService.getCurrentUser();
      
      if (userData) {
        toast.success("Google ile giriş başarılı!");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      } else {
        toast.error("Giriş doğrulanamadı");
        return { success: false };
      }
    } catch (error: any) {
      console.error("Google OAuth error:", error);
      toast.error("Google ile giriş başarısız");
      return { success: false };
    }
  },

  // Send OTP
  sendOtpRequest: async (phone: string): Promise<AuthResult> => {
    try {
      const phoneWithPrefix = cookieAuthService.formatPhoneNumber(phone);
      await axiosPrivate.post(authEndPoint.otpSend, { phone: phoneWithPrefix });
      toast.success("OTP kodu gönderildi");
      return { success: true };
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP gönderilemedi");
      return { success: false };
    }
  },

  // Verify OTP for login
  verifyOtpForLogin: async (
    phone: string,
    code: string,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const phoneWithPrefix = cookieAuthService.formatPhoneNumber(phone);
      const response = await axiosPrivate.post(authEndPoint.otpVerify, {
        phoneNumber: phoneWithPrefix,
        code: code,
      });

      if (response.data.success || response.status === 200) {
        // Backend should set HttpOnly cookies automatically
        toast.success("Giriş başarılı!");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      } else {
        toast.error("OTP doğrulanamadı");
        return { success: false };
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
      return { success: false };
    }
  },

  // Register user
  registerUser: async (
    userData: RegisterData,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const response = await axiosPrivate.post(authEndPoint.register, userData);

      if (response.data.success || response.status === 201) {
        // Backend should set HttpOnly cookies automatically
        toast.success(`Kayıt başarılı! Hoş geldiniz ${userData.name}!`);
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      } else {
        toast.error("Kayıt başarısız");
        return { success: false };
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Kayıt başarısız");
      return { success: false };
    }
  },

  // Logout (backend clears HttpOnly cookies)
  logout: async (navigate: (path: string, options?: any) => void): Promise<void> => {
    try {
      // Call backend logout endpoint to clear HttpOnly cookies
      await axiosPrivate.post(authEndPoint.logout);
      toast.success("Çıkış yapıldı");
      navigate("/", { replace: true });
    } catch (error: any) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to home
      toast.info("Çıkış yapıldı");
      navigate("/", { replace: true });
    }
  },

  // Check if user is authenticated (by trying to fetch user data)
  checkAuth: async (): Promise<{ isAuthenticated: boolean; user: any | null }> => {
    try {
      const userData = await cookieAuthService.getCurrentUser();
      return { isAuthenticated: true, user: userData };
    } catch (error) {
      return { isAuthenticated: false, user: null };
    }
  }
};
