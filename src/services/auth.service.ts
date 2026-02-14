import axiosPrivate from "@/config/api";
import { authEndPoint } from "@/config/endpoint";
import { toast } from "@/utils/toast";
import { SecureStorage } from "@/utils/secureStorage";

export interface LoginCredentials {
  name: string;
  password: string;
  phoneNumber?: string;
  userName?: string;
  avatarUrl?: string;
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
  shouldShowRegister?: boolean;
  phoneNumber?: string;
  message?: string;
}

// Global variable to track ongoing user fetch requests
let currentUserRequest: Promise<any> | null = null;

const getApiErrorMessage = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  const msg =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.data?.message === "string" && data.data.message) ||
    (typeof data?.data?.error === "string" && data.data.error) ||
    (typeof error?.message === "string" && error.message);
  return msg || fallback;
};

const extractTokens = (
  payload: any
): { accessToken?: string; refreshToken?: string } => {
  const data = payload && typeof payload === "object" ? payload : {};
  const nested = data.data && typeof data.data === "object" ? data.data : {};

  const accessToken =
    data.accessToken ||
    data.access_token ||
    data.token ||
    nested.accessToken ||
    nested.access_token ||
    nested.token;

  const refreshToken =
    data.refreshToken ||
    data.refresh_token ||
    nested.refreshToken ||
    nested.refresh_token;

  return {
    accessToken: accessToken ? String(accessToken) : undefined,
    refreshToken: refreshToken ? String(refreshToken) : undefined,
  };
};


const extractUserIdFromPayload = (payload: any): string | undefined => {
  const data = payload && typeof payload === "object" ? payload : {};
  const nested = data.data && typeof data.data === "object" ? data.data : {};

  const candidates = [
    data?.user?.id,
    data?.data?.user?.id,
    data?.userId,
    data?.id,
    nested?.user?.id,
    nested?.userId,
    nested?.id,
  ];

  const matched = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return matched ? String(matched) : undefined;
};

const decodeUserIdFromStoredAccessToken = (): string | null => {
  const token =
    SecureStorage.getSessionItem("accessToken") ||
    SecureStorage.getItem("accessToken") ||
    SecureStorage.getSessionItem("token") ||
    SecureStorage.getItem("token");

  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    const id = payload?.id || payload?.sub || payload?.userId;
    return typeof id === "string" && id.trim().length > 0 ? id : null;
  } catch {
    return null;
  }
};

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
    SecureStorage.setSessionItem("accessToken", accessToken);
    SecureStorage.setItem("accessToken", accessToken);
    // Legacy compatibility keys used in some flows/tools
    SecureStorage.setSessionItem("token", accessToken);
    SecureStorage.setItem("token", accessToken);
    if (refreshToken) {
      SecureStorage.setSessionItem("refreshToken", refreshToken);
      SecureStorage.setItem("refreshToken", refreshToken);
    }
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:tokens"));
      }
    } catch {}
  },

  // Store tokens without dispatching auth:tokens (used during signup OTP so we don't
  // trigger auth context and redirect; register request will use this token).
  storeTokensSilent: (accessToken: string, refreshToken?: string): void => {
    SecureStorage.setSessionItem("accessToken", accessToken);
    SecureStorage.setItem("accessToken", accessToken);
    SecureStorage.setSessionItem("token", accessToken);
    SecureStorage.setItem("token", accessToken);
    if (refreshToken) {
      SecureStorage.setSessionItem("refreshToken", refreshToken);
      SecureStorage.setItem("refreshToken", refreshToken);
    }
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
    SecureStorage.removeSessionItem("token");
    SecureStorage.removeSessionItem("authToken");
    SecureStorage.removeItem("accessToken");
    SecureStorage.removeItem("refreshToken");
    SecureStorage.removeItem("token");
    SecureStorage.removeItem("authToken");
    SecureStorage.removeSessionItem("userId");
    SecureStorage.removeItem("userId");
    
    // Clear all test-related session tokens
    authService.clearAllTestTokens();
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
      const tokens = authService.getStoredTokens();
      if (!tokens) return;
      
      const { accessToken, refreshToken } = tokens;
      
      // Check if access token is expired
      if (accessToken && authService.isTokenExpired(accessToken)) {
        console.log('Access token expired, clearing all tokens');
        authService.clearStoredTokens();
        return;
      }
      
      // Check if refresh token is expired
      if (refreshToken && authService.isTokenExpired(refreshToken)) {
        console.log('Refresh token expired, clearing all tokens');
        authService.clearStoredTokens();
        return;
      }
      
      // Clean up test-related tokens that might be expired
      authService.cleanupExpiredTestTokens();
      
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
      // const currentTime = Math.floor(Date.now() / 1000);
      
      keys.forEach(key => {
        if (key.includes('overall.sessionToken')) {
          const token = sessionStorage.getItem(key);
          if (token && authService.isTokenExpired(token)) {
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
          const meUserId = extractUserIdFromPayload(response.data);
          if (meUserId) {
            SecureStorage.setSessionItem("userId", meUserId);
            SecureStorage.setItem("userId", meUserId);
          }
          return response.data;
        }

        throw new Error("No user data returned from /api/auth/me");
      } catch (error: any) {
        console.error("Error fetching user from /api/auth/me:", error);

        // If /api/auth/me fails, try to use /api/user/{id} if we have a stored user ID
        let userId =
          SecureStorage.getSessionItem("userId") ||
          SecureStorage.getItem("userId");
        if (!userId) {
          const decodedUserId = decodeUserIdFromStoredAccessToken();
          if (decodedUserId) {
            userId = decodedUserId;
            SecureStorage.setSessionItem("userId", decodedUserId);
            SecureStorage.setItem("userId", decodedUserId);
          }
        }
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
      const res = await axiosPrivate.post(authEndPoint.otpSend, {
        phone: phoneWithPrefix,
      });

      // Dev convenience: backend may return the OTP code when SMS provider isn't configured.
      const otpCode = res?.data?.code ?? res?.data?.data?.code;
      if (import.meta.env.DEV && otpCode) {
        toast.info(`OTP: ${otpCode}`);
      }
      toast.success("OTP kodu gönderildi");
      return { success: true };
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "OTP gönderilemedi"));
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

      const { accessToken, refreshToken } = extractTokens(response.data);

      if (accessToken) {
        const userId = extractUserIdFromPayload(response.data);
        if (userId) {
          SecureStorage.setSessionItem("userId", userId);
          SecureStorage.setItem("userId", userId);
        }
        authService.storeTokens(accessToken, refreshToken);
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });

        return { success: true, shouldNavigate: true };
      }

      const backendMsg =
        (typeof response.data?.message === "string" && response.data.message) ||
        (typeof response.data?.error === "string" && response.data.error) ||
        (typeof response.data?.data?.message === "string" &&
          response.data.data.message) ||
        (typeof response.data?.data?.error === "string" &&
          response.data.data.error);

      toast.error(backendMsg || "Giriş başarısız");
      return { success: false };
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "Giriş başarısız"));
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

      const { accessToken, refreshToken } = extractTokens(response.data);

      if (accessToken) {
        const userId = extractUserIdFromPayload(response.data);
        if (userId) {
          SecureStorage.setSessionItem("userId", userId);
          SecureStorage.setItem("userId", userId);
        }
        authService.storeTokens(accessToken, refreshToken);
        toast.success("Giriş başarılı");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      }

      // OTP valid but no token = new user; show register form in modal instead of navigating home
      const responseMsg =
        (typeof response.data?.message === "string" && response.data.message) ||
        (typeof response.data?.error === "string" && response.data.error) ||
        (typeof response.data?.data?.message === "string" &&
          response.data.data.message) ||
        (typeof response.data?.data?.error === "string" &&
          response.data.data.error) ||
        "";

      if (response.status === 200 || responseMsg) {
        const msg = String(responseMsg || "").toLowerCase();
        const isNewUser =
          !accessToken &&
          (msg.includes("kayıt") ||
            msg.includes("register") ||
            msg.includes("mevcut değil") ||
            msg.includes("bulunamadı") ||
            msg.includes("doğrulandı") ||
            msg.includes("verified"));
        if (isNewUser || !accessToken) {
          toast.success("OTP doğrulandı - Kayıt formunu doldurun");
          return {
            success: true,
            shouldShowRegister: true,
            phoneNumber: phoneWithPrefix,
          };
        }
      }

      toast.error("OTP doğrulanamadı");
      return { success: false };
    } catch (error: any) {
      const msg = String(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error.response?.data?.data?.message ||
          error.response?.data?.data?.error ||
          ""
      ).toLowerCase();
      if (
        error.response?.status === 404 ||
        msg.includes("bulunamadı") ||
        msg.includes("mevcut değil") ||
        msg.includes("kayıt")
      ) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        const phoneWithPrefix = authService.formatPhoneNumber(phone);
        return {
          success: true,
          shouldShowRegister: true,
          phoneNumber: phoneWithPrefix,
        };
      }
      toast.error(getApiErrorMessage(error, "OTP doğrulanamadı"));
      return { success: false };
    }
  },

  // Verify OTP for signup - complete flow
  // Uses fetch with redirect: 'manual' so backend 302 does not cause full-page redirect to home.
  verifyOtpForSignup: async (
    phone: string,
    code: string,
    navigate: (path: string, options?: any) => void
  ): Promise<AuthResult & { phoneNumber?: string }> => {
    const phoneWithPrefix = authService.formatPhoneNumber(phone);
    const baseURL = import.meta.env.VITE_API_URL || "https://api.turkishmock.uz";
    const url = `${baseURL}${authEndPoint.otpVerify}`;
    const token = SecureStorage.getSessionItem("accessToken");

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          phoneNumber: phoneWithPrefix,
          code,
          isSignUp: true,
        }),
        redirect: "manual",
      });

      // Backend returned redirect (e.g. 302 to /) — do not follow; show register form.
      if (res.type === "opaqueredirect" || res.redirected || res.status === 301 || res.status === 302) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      let data: any = {};
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = {};
        }
      }

      const message: string = String(data?.message || "");
      const statusOk = res.status >= 200 && res.status < 300;
      const dataSuccess = data?.success === true;
      const messageIndicatesSuccess = /verified|doğruland|tasdiqlandi/i.test(message) || message.includes("tasdiqlandi");
      const hasAccessToken = !!data?.accessToken;

      const needsRegistration =
        data?.requiresRegistration === true ||
        data?.needsRegistration === true ||
        data?.completeProfile === true ||
        data?.isNewUser === true ||
        data?.registered === false;
      const successNoToken = (statusOk || dataSuccess || messageIndicatesSuccess) && !hasAccessToken;
      const hasTokenButNewUser = hasAccessToken && needsRegistration;

      if (needsRegistration || successNoToken || hasTokenButNewUser) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      if (hasAccessToken) {
        authService.storeTokensSilent(data.accessToken, data.refreshToken);
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      if (data.userExists || (typeof data.message === "string" && data.message.includes("kullanıcı mevcut"))) {
        toast.info(
          "Bu telefon numarası kayıtlı. Giriş sayfasına yönlendiriliyorsunuz."
        );
        navigate("/login", { replace: true });
        return { success: true, shouldRedirectToLogin: true };
      }

      toast.error("OTP doğrulanamadı");
      return { success: false };
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, "OTP doğrulanamadı"));
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

      const { accessToken, refreshToken } = extractTokens(response.data);

      if (accessToken) {
        const userId = extractUserIdFromPayload(response.data);
        if (userId) {
          SecureStorage.setSessionItem("userId", userId);
          SecureStorage.setItem("userId", userId);
        }
        authService.storeTokens(accessToken, refreshToken);

        // Store user ID if returned in registration response
        if (response.data.user && response.data.user.id) {
          SecureStorage.setSessionItem("userId", response.data.user.id);
          console.log("Stored user ID:", response.data.user.id);
        } else if (response.data.data?.user?.id) {
          SecureStorage.setSessionItem("userId", response.data.data.user.id);
          console.log("Stored user ID:", response.data.data.user.id);
        } else if (response.data.id) {
          SecureStorage.setSessionItem("userId", response.data.id);
          console.log("Stored user ID from root:", response.data.id);
        } else if (response.data.data?.id) {
          SecureStorage.setSessionItem("userId", response.data.data.id);
          console.log("Stored user ID from data:", response.data.data.id);
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
        const createdUser = (response.data &&
          (response.data.user ||
            response.data.data?.user ||
            response.data.data ||
            response.data)) as any;
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
          const loginTokens = extractTokens(loginResp?.data);
          if (loginTokens.accessToken) {
            authService.storeTokens(loginTokens.accessToken, loginTokens.refreshToken);
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
      toast.error(getApiErrorMessage(error, "Kayıt başarısız"));
      return { success: false };
    }
  },
};

// Auth service for handling authentication flows
