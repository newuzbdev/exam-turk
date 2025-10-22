import axiosPrivate from "@/config/api";
import { authEndPoint } from "@/config/endpoint";
import { toast } from "@/utils/toast";
import { SecureStorage } from "@/utils/secureStorage";

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

export interface OtpSendData {
  phone: string;
}

export interface OtpVerifyData {
  phoneNumber: string;
  code: string;
  isSignUp?: boolean;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  message?: string;
  userExists?: boolean;
  [key: string]: any; // For additional properties that might be returned
}

export interface AuthResult {
  success: boolean;
  shouldNavigate?: boolean;
  shouldRedirectToLogin?: boolean;
  message?: string;
}

// Global variable to track ongoing user fetch requests
let currentUserRequest: Promise<any> | null = null;

export const authService = {
  // Helper function to format phone number
  formatPhoneNumber: (phone: string): string => {
    // Remove spaces and + sign, format phone number
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

  // Upload avatar file and return URL or path
  uploadAvatar: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file);
    const res = await axiosPrivate.post(`/api/file/upload`, form);
    const data = res?.data || {};
    const uploadedUrl = data.url || data.fileUrl || data.path || data.avatarUrl || (data.data && (data.data.url || data.data.path)) || "";
    return String(uploadedUrl);
  },

  // Update user profile
  updateUser: async (
    userId: string,
    updates: Partial<{
      name: string;
      userName: string;
      avatarUrl: string;
      phoneNumber: string;
      email: string | null;
    }>,
    options?: { avatarFile?: File | null }
  ): Promise<any> => {
    try {
      const hasFile = !!options?.avatarFile;
      let effectiveUpdates = { ...(updates || {}) } as any;
      if (hasFile && options?.avatarFile) {
        const uploadedUrl = await authService.uploadAvatar(options.avatarFile);
        if (uploadedUrl) {
          effectiveUpdates.avatarUrl = uploadedUrl;
        }
      }
      const res = await axiosPrivate.patch(`${authEndPoint.user}/${userId}`, effectiveUpdates);
      const updatedUser = res?.data || updates;
      try {
        if (updatedUser?.id) {
          SecureStorage.setSessionItem("userId", updatedUser.id);
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:user", { detail: updatedUser }));
        }
      } catch {}
      toast.success("Profil güncellendi");
      return updatedUser;
    } catch (error: any) {
      console.error("Update user error:", error);
      toast.error(error?.response?.data?.message || "Profil güncellenemedi");
      throw error;
    }
  },

  // Helper function to store tokens securely
  storeTokens: (accessToken: string, refreshToken?: string): void => {
    // Store tokens in sessionStorage instead of localStorage for better security
    // They will be cleared when browser/tab is closed
    SecureStorage.setSessionItem("accessToken", accessToken);
    if (refreshToken) {
      SecureStorage.setSessionItem("refreshToken", refreshToken);
    }

    // Notify app that auth tokens changed so contexts can refresh
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:tokens"));
      }
    } catch {}

    // Alternative: Use encrypted storage (still not as secure as httpOnly cookies)
    // SecureStorage.setEncryptedItem("accessToken", accessToken);
    // if (refreshToken) {
    //   SecureStorage.setEncryptedItem("refreshToken", refreshToken);
    // }
  },

  // Helper function to get stored tokens
  getStoredTokens: (): {
    accessToken: string | null;
    refreshToken: string | null;
  } => {
    return {
      accessToken: SecureStorage.getSessionItem("accessToken"),
      refreshToken: SecureStorage.getSessionItem("refreshToken"),
    };
  },

  // Helper function to clear stored tokens
  clearStoredTokens: (): void => {
    SecureStorage.removeSessionItem("accessToken");
    SecureStorage.removeSessionItem("refreshToken");
    SecureStorage.removeSessionItem("userId");
    
    // Clear all test-related session tokens
    this.clearAllTestTokens();
  },

  // Helper function to clear all test-related tokens
  clearAllTestTokens: (): void => {
    try {
      // Get all session storage keys
      const keys = Object.keys(sessionStorage);
      
      // Clear all test-related tokens
      keys.forEach(key => {
        if (key.includes('overall.sessionToken') || 
            key.includes('test_data_') || 
            key.includes('_answers_') ||
            key.includes('overall.flow')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('Cleared all test-related tokens');
    } catch (error) {
      console.error('Error clearing test tokens:', error);
    }
  },

  // Helper function to check if JWT token is expired
  isTokenExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime;
      console.log('🔍 Token expiration check:', {
        exp: payload.exp,
        currentTime,
        isExpired,
        expiresIn: payload.exp - currentTime
      });
      return isExpired;
    } catch (error) {
      console.error('Error parsing token:', error);
      // If we can't parse it, don't consider it expired - let the server decide
      return false;
    }
  },

  // Helper function to clean up expired tokens on app start
  cleanupExpiredTokens: (): void => {
    try {
      const { accessToken, refreshToken } = this.getStoredTokens();
      
      // Check if access token is expired
      if (accessToken && this.isTokenExpired(accessToken)) {
        console.log('Access token expired, clearing all tokens');
        this.clearStoredTokens();
        return;
      }
      
      // Check if refresh token is expired
      if (refreshToken && this.isTokenExpired(refreshToken)) {
        console.log('Refresh token expired, clearing all tokens');
        this.clearStoredTokens();
        return;
      }
      
      // Clean up test-related tokens that might be expired
      this.cleanupExpiredTestTokens();
      
    } catch (error) {
      console.error('Error during token cleanup:', error);
      // Don't clear tokens on error - just log the error
      // Only clear tokens if they are actually expired
    }
  },

  // Helper function to clean up expired test tokens
  cleanupExpiredTestTokens: (): void => {
    try {
      const keys = Object.keys(sessionStorage);
      const currentTime = Math.floor(Date.now() / 1000);
      
      keys.forEach(key => {
        if (key.includes('overall.sessionToken')) {
          const token = sessionStorage.getItem(key);
          if (token && this.isTokenExpired(token)) {
            console.log(`Clearing expired test token: ${key}`);
            sessionStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Error cleaning up test tokens:', error);
    }
  },

  // Helper function to get current user data (with request deduplication)
  getCurrentUser: async (): Promise<any> => {
    // If there's already a request in progress, return that promise
    if (currentUserRequest) {
      console.log("Reusing existing user data request...");
      return currentUserRequest;
    }

    // Create new request
    currentUserRequest = (async () => {
      try {
        // First try the /api/auth/me endpoint
        console.log("Trying to fetch user data from /api/auth/me...");
        const response = await axiosPrivate.get(authEndPoint.me);
        console.log("User data from /api/auth/me:", response.data);

        if (response.data) {
          return response.data;
        }

        throw new Error("No user data returned from /api/auth/me");
      } catch (error: any) {
        console.error("Error fetching user from /api/auth/me:", error);

        // If /api/auth/me fails, try to use /api/user/{id} if we have a stored user ID
        const userId = SecureStorage.getSessionItem("userId");
        if (userId) {
          try {
            console.log(
              `Trying to fetch user data from /api/user/${userId}...`
            );
            const userResponse = await axiosPrivate.get(
              `${authEndPoint.user}/${userId}`
            );
            console.log("User data from /api/user/{id}:", userResponse.data);
            return userResponse.data;
          } catch (userError) {
            console.error(
              "Error fetching user from /api/user/{id}:",
              userError
            );
          }
        }

        // If both methods fail, throw the original error
        throw error;
      } finally {
        // Clear the request when done
        currentUserRequest = null;
      }
    })();

    return currentUserRequest;
  },

  // Send OTP to phone number
  sendOtpRequest: async (phone: string): Promise<AuthResult> => {
    try {
      const phoneWithPrefix = authService.formatPhoneNumber(phone);
      await axiosPrivate.post(authEndPoint.otpSend, { phone: phoneWithPrefix });
      toast.success("OTP kodu gönderildi");
      return { success: true };
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP gönderilemedi");
      return { success: false };
    }
  },

  // Login with username and password - complete flow
  loginWithCredentials: async (
    credentials: LoginCredentials,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const response = await axiosPrivate.post(authEndPoint.login, credentials);

      if (response.data.accessToken) {
        authService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
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

  // Verify OTP for login - complete flow
  verifyOtpForLogin: async (
    phone: string,
    code: string,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const phoneWithPrefix = authService.formatPhoneNumber(phone);
      const response = await axiosPrivate.post(authEndPoint.otpVerify, {
        phoneNumber: phoneWithPrefix,
        code: code,
      });

      if (response.data.accessToken) {
        authService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });

        return { success: true, shouldNavigate: true };
      } else if (response.data.message || response.status === 200) {
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });

        return { success: true, shouldNavigate: true };
      }
      return { success: false };
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
      return { success: false };
    }
  },

  // Verify OTP for signup - complete flow
  verifyOtpForSignup: async (
    phone: string,
    code: string,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult & { phoneNumber?: string }> => {
    try {
      const phoneWithPrefix = authService.formatPhoneNumber(phone);
      const response = await axiosPrivate.post(authEndPoint.otpVerify, {
        phoneNumber: phoneWithPrefix,
        code: code,
        isSignUp: true,
      });

      // Check if the response contains an access token (user already exists)
      if (response.data.accessToken) {
        authService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );
        toast.success("Giriş başarılı! Kullanıcı zaten mevcut.");
        navigate("/", { replace: true });

        return { success: true, shouldNavigate: true };
      }

      // Check if user exists but needs login
      if (
        response.data.userExists ||
        response.data.message?.includes("kullanıcı mevcut")
      ) {
        toast.info(
          "Bu telefon numarası kayıtlı. Giriş sayfasına yönlendiriliyorsunuz."
        );
        navigate("/login", { replace: true });
        return { success: true, shouldRedirectToLogin: true };
      }

      // OTP verified but user doesn't exist, proceed to registration
      const message: string = String(response?.data?.message || "");
      const statusOk = response.status === 200;
      const messageIndicatesSuccess = /verified|doğruland/i.test(message) || message.includes("tasdiqlandi");

      if (statusOk || messageIndicatesSuccess) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      toast.error("OTP doğrulanamadı");
      return { success: false };
    } catch (error: any) {
      toast.error(error.response?.data?.message || "OTP doğrulanamadı");
      return { success: false };
    }
  },

  // Register user - complete flow
  registerUser: async (
    data: RegisterData,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult> => {
    try {
      const response = await axiosPrivate.post(authEndPoint.register, data);
      console.log("Registration response:", response.data); // Debug log

      if (response.data.accessToken) {
        authService.storeTokens(
          response.data.accessToken,
          response.data.refreshToken
        );

        // Store user ID if returned in registration response
        if (response.data.user && response.data.user.id) {
          SecureStorage.setSessionItem("userId", response.data.user.id);
          console.log("Stored user ID:", response.data.user.id);
        } else if (response.data.id) {
          SecureStorage.setSessionItem("userId", response.data.id);
          console.log("Stored user ID from root:", response.data.id);
        } else {
          console.log("No user ID found in registration response");
        }

        // Get user data after successful registration
        try {
          const userResponse = await authService.getCurrentUser();
          if (userResponse) {
            try {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("auth:user", { detail: userResponse }));
              }
            } catch {}
            toast.success(`Kayıt başarılı! Hoş geldiniz ${userResponse.name}!`);
            navigate("/", { replace: true });

            return { success: true, shouldNavigate: true };
          }
        } catch (userError) {
          console.error(
            "Error fetching user data after registration:",
            userError
          );
          // If getting user data fails, still redirect but with generic message
          toast.success("Kayıt başarılı! Hoş geldiniz!");
          navigate("/", { replace: true });

          return { success: true, shouldNavigate: true };
        }
      } else {
        // If backend returned the created user, use it directly to update UI
        const createdUser = (response.data && (response.data.user || response.data)) as any;
        if (createdUser && createdUser.id && (createdUser.name || createdUser.userName)) {
          try {
            SecureStorage.setSessionItem("userId", createdUser.id);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth:user", { detail: createdUser }));
            }
          } catch {}
          toast.success(`Kayıt başarılı! Hoş geldiniz ${createdUser.name || createdUser.userName}!`);
          navigate("/", { replace: true });
          return { success: true, shouldNavigate: true };
        }

        // Otherwise, perform a silent login using provided credentials to obtain tokens
        try {
          const loginResp = await axiosPrivate.post(authEndPoint.login, {
            name: data.name,
            password: data.password,
          });
          if (loginResp?.data?.accessToken) {
            authService.storeTokens(loginResp.data.accessToken, loginResp.data.refreshToken);
            // Fetch user and notify app
            try {
              const userResponse = await authService.getCurrentUser();
              if (userResponse?.id) {
                SecureStorage.setSessionItem("userId", userResponse.id);
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("auth:user", { detail: userResponse }));
              }
            } catch {}
            toast.success("Kayıt başarılı! Hoş geldiniz!");
            navigate("/", { replace: true });
            return { success: true, shouldNavigate: true };
          }
        } catch (e) {
          // Swallow and continue to generic success
        }

        // Fallback: generic success without user hydration
        toast.success("Kayıt başarılı");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      }
      return { success: false };
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.response?.data?.message || "Kayıt başarısız");
      return { success: false };
    }
  },
};

// Auth service for handling authentication flows
