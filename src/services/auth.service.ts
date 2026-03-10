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
  accountType?: "STUDENT" | "TEACHER" | "INSTITUTION";
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
  [key: string]: unknown;
}

export interface AuthResult {
  success: boolean;
  shouldNavigate?: boolean;
  shouldRedirectToLogin?: boolean;
  shouldShowRegister?: boolean;
  phoneNumber?: string;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
  telegramUser?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    telegramId?: string | number;
  };
}

// Global variable to track ongoing user fetch requests
let currentUserRequest: Promise<Record<string, unknown> | null> | null = null;

const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const err = error as { response?: { data?: Record<string, unknown>; status?: number }; message?: string };
  const data = err?.response?.data;
  const nested = data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : undefined;
  const msg =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof nested?.message === "string" && nested.message) ||
    (typeof nested?.error === "string" && nested.error) ||
    (typeof err?.message === "string" && err.message);
  return msg || fallback;
};

const extractTokens = (
  payload: unknown
): { accessToken?: string; refreshToken?: string } => {
  const data: Record<string, unknown> = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested: Record<string, unknown> = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};

  const accessToken =
    (data.accessToken ?? data.access_token ?? data.token ?? nested.accessToken ?? nested.access_token ?? nested.token) as string | undefined;
  const refreshToken =
    (data.refreshToken ?? data.refresh_token ?? nested.refreshToken ?? nested.refresh_token) as string | undefined;

  return {
    accessToken: accessToken ? String(accessToken) : undefined,
    refreshToken: refreshToken ? String(refreshToken) : undefined,
  };
};

const extractUserFromPayload = (payload: unknown): Record<string, unknown> | null => {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const data = p.data && typeof p.data === "object" ? (p.data as Record<string, unknown>) : null;
  const candidates = [p.user, data?.user, data, p];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const c = candidate as Record<string, unknown>;
    if (
      c.id ||
      c.userId ||
      c.accountType ||
      c.username ||
      c.userName ||
      c.phoneNumber ||
      c.email
    ) {
      return c;
    }
  }

  return null;
};


const extractUserIdFromPayload = (payload: unknown): string | undefined => {
  const data: Record<string, unknown> = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested: Record<string, unknown> = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {};

  const dataUser = data?.user as Record<string, unknown> | undefined;
  const dataData = data?.data as Record<string, unknown> | undefined;
  const nestedUser = nested?.user as Record<string, unknown> | undefined;
  const candidates: (string | undefined)[] = [
    dataUser?.id as string | undefined,
    (dataData?.user as Record<string, unknown> | undefined)?.id as string | undefined,
    data?.userId as string | undefined,
    data?.id as string | undefined,
    nestedUser?.id as string | undefined,
    nested?.userId as string | undefined,
    nested?.id as string | undefined,
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
    const digits = String(phone || "").replace(/\D/g, "");
    const normalized = digits.startsWith("998")
      ? digits
      : digits.length === 9
        ? `998${digits}`
        : digits;
    return normalized ? `+${normalized}` : "";
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
      accountType: "STUDENT" | "TEACHER" | "INSTITUTION";
    }>,
    options?: { avatarFile?: File | null }
  ): Promise<Record<string, unknown>> => {
    try {
      const hasFile = !!options?.avatarFile;
      const effectiveUpdates: Record<string, unknown> = { ...(updates || {}) };
      if (
        typeof effectiveUpdates.userName === "string" &&
        !effectiveUpdates.username
      ) {
        effectiveUpdates.username = effectiveUpdates.userName;
      }
      delete effectiveUpdates.userName;
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
      } catch {
        // no-op
      }
      toast.success("Profil güncellendi");
      return updatedUser;
    } catch (error: unknown) {
      console.error("Update user error:", error);
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Profil güncellenemedi");
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
    } catch {
      // no-op
    }
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
      console.log('ğŸ” Token expiration check:', {
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
  getCurrentUser: async (): Promise<Record<string, unknown> | null> => {
    // If there's already a request in progress, return that promise
    if (currentUserRequest) {
      console.log("Reusing existing user data request...");
      return currentUserRequest;
    }

    // Create new request
    currentUserRequest = (async (): Promise<Record<string, unknown> | null> => {
      try {
        // First try the /api/auth/me endpoint
        console.log("Trying to fetch user data from /api/auth/me...");
        const response = await axiosPrivate.get(authEndPoint.me);
        console.log("User data from /api/auth/me:", response.data);

        const meUser = extractUserFromPayload(response.data);
        if (meUser) {
          const meUserId = extractUserIdFromPayload(meUser);
          if (meUserId) {
            SecureStorage.setSessionItem("userId", meUserId);
            SecureStorage.setItem("userId", meUserId);
          }
          return meUser;
        }

        throw new Error("No user data returned from /api/auth/me");
      } catch (error: unknown) {
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
            const userData = extractUserFromPayload(userResponse.data);
            return userData ?? (userResponse.data as Record<string, unknown>);
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
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "OTP gönderilemedi"));
      return { success: false };
    }
  },

  // Start Telegram login: call API init, returns sessionToken and botLink
  // NOTE: Always call production API directly so it does not depend on local axios baseURL.
  initTelegramAuth: async (): Promise<{ sessionToken: string; botLink: string } | null> => {
    try {
      const url = "https://api.turkishmock.uz/api/auth/telegram/init";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        let payload: any = {};
        try {
          payload = await response.json();
        } catch {
          payload = {};
        }
        const message = getApiErrorMessage(
          { response: { data: payload } },
          "Telegram girişi başlatılamadı",
        );
        toast.error(message);
        return null;
      }

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      const sessionToken = data?.sessionToken ?? data?.data?.sessionToken;
      const botLink = data?.botLink ?? data?.data?.botLink;
      if (sessionToken && botLink) {
        return { sessionToken: String(sessionToken), botLink: String(botLink) };
      }
      toast.error("Telegram girişi için geçersiz yanıt alındı");
      return null;
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Telegram girişi başlatılamadı"));
      return null;
    }
  },

  // Verify Telegram code with session from init (main API: /api/auth/telegram/verify-code)
  // NOTE: Always call production API directly so it does not depend on local axios baseURL.
  verifyTelegramCode: async (code: string, sessionToken: string): Promise<AuthResult> => {
    try {
      const trimmed = String(code || "").trim();
      if (!/^\d{4,6}$/.test(trimmed)) {
        toast.error("4 veya 6 haneli kodu girin");
        return { success: false };
      }

      const url = "https://api.turkishmock.uz/api/auth/telegram/verify-code";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: trimmed,
          sessionToken,
        }),
      });

      let data: any = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        const message =
          (typeof data?.message === "string" && data.message) ||
          "Telegram kodu yanlış veya süresi dolmuş";
        toast.error(message);
        return { success: false, message };
      }

      const user = data?.user ?? data?.data?.user ?? {};
      const { accessToken, refreshToken } = extractTokens(data);
      if (!accessToken) {
        const message =
          (typeof data?.message === "string" && data.message) ||
          "Telegram tasdiqlandi, lekin oturum yaratmadi";
        toast.error(message);
        return { success: false, message };
      }

      toast.success("Telegram kodi tasdiqlandi");
      return {
        success: true,
        message: "Telegram kodi tasdiqlandi",
        accessToken,
        refreshToken,
        telegramUser: {
          firstName: typeof user?.firstName === "string" ? user.firstName : "",
          lastName: typeof user?.lastName === "string" ? user.lastName : "",
          phoneNumber: typeof user?.phoneNumber === "string" ? user.phoneNumber : "",
          telegramId:
            typeof user?.telegramId === "string" || typeof user?.telegramId === "number"
              ? user.telegramId
              : undefined,
        },
      };
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Telegram kodi tasdiqlanmadi"));
      return { success: false };
    }
  },

  // Verify Telegram OTP (legacy 6-digit from old bot flow; prefer init + verifyTelegramCode)
  verifyTelegramOtp: async (otpCode: string, sessionToken?: string): Promise<AuthResult> => {
    if (sessionToken) {
      return authService.verifyTelegramCode(otpCode, sessionToken);
    }
    try {
      const code = String(otpCode || "").trim();
      if (!/^\d{6}$/.test(code)) {
        toast.error("6 xonali Telegram kodini kiriting");
        return { success: false };
      }

      const baseURL =
        import.meta.env.VITE_TELEGRAM_OTP_API_URL ||
        (import.meta.env.DEV ? "http://localhost:3002" : "");
      const verifyUrl = import.meta.env.VITE_TELEGRAM_VERIFY_URL || `${baseURL}/api/verify-telegram`;

      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otpCode: code }),
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = {};
        }
      }

      if (!response.ok || data?.success !== true) {
        const errorMessage =
          (typeof data?.message === "string" && data.message) ||
          "Telegram kodu yanlış veya süresi dolmuş";
        toast.error(errorMessage);
        return { success: false, message: errorMessage };
      }

      const user = data?.user || {};
      const { accessToken, refreshToken } = extractTokens(data);
      if (!accessToken) {
        const message =
          (typeof data?.message === "string" && data.message) ||
          "Telegram tasdiqlandi, lekin backend oturum yaratmadi";
        toast.error(message);
        return { success: false, message };
      }

      toast.success("Telegram kodi tasdiqlandi");
      return {
        success: true,
        message: "Telegram kodi tasdiqlandi",
        accessToken,
        refreshToken,
        telegramUser: {
          firstName: typeof user?.firstName === "string" ? user.firstName : "",
          lastName: typeof user?.lastName === "string" ? user.lastName : "",
          phoneNumber: typeof user?.phoneNumber === "string" ? user.phoneNumber : "",
          telegramId:
            typeof user?.telegramId === "string" || typeof user?.telegramId === "number"
              ? user.telegramId
              : undefined,
        },
      };
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Telegram kodi tasdiqlanmadi"));
      return { success: false };
    }
  },

  // Send password reset OTP
  requestPasswordReset: async (phone: string): Promise<AuthResult> => {
    try {
      const identifier = authService.formatPhoneNumber(phone);
      const res = await axiosPrivate.post(authEndPoint.passwordReset, {
        identifier,
      });

      const otpCode = res?.data?.code ?? res?.data?.data?.code;
      if (import.meta.env.DEV && otpCode) {
        toast.info(`OTP: ${otpCode}`);
      }

      toast.success("Şifre sıfırlama kodu gönderildi");
      return { success: true };
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Şifre sıfırlama kodu gönderilemedi"));
      return { success: false };
    }
  },

  // Verify password reset OTP and set new password
  confirmPasswordReset: async (
    phone: string,
    code: string,
    newPassword: string
  ): Promise<AuthResult> => {
    try {
      const identifier = authService.formatPhoneNumber(phone);
      await axiosPrivate.post(authEndPoint.passwordResetConfirm, {
        identifier,
        code,
        newPassword,
      });

      toast.success("Şifreniz güncellendi. Şimdi giriş yapabilirsiniz.");
      return { success: true };
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Şifre güncellenemedi"));
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string; error?: string }; status?: number } };
      const data = err?.response?.data;
      const nested = data && typeof (data as Record<string, unknown>).data === "object"
        ? (data as Record<string, { message?: string; error?: string }>).data
        : undefined;
      const msg = String(
        data?.message ||
          data?.error ||
          nested?.message ||
          nested?.error ||
          ""
      ).toLowerCase();
      if (
        err?.response?.status === 404 ||
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
    const baseURL =
      import.meta.env.VITE_API_URL ||
      (import.meta.env.DEV ? "http://localhost:3000" : "https://api.turkishmock.uz");
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

      // Backend returned redirect (e.g. 302 to /) - do not follow; show register form.
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
      const messageIndicatesSuccess =
        /verified|doğruland|tasdiqlandi/i.test(message) ||
        message.includes("tasdiqlandi");
      const hasAccessToken = !!data?.accessToken;
      const isExistingUser =
        data?.userExists === true ||
        (typeof data?.message === "string" &&
          data.message.toLowerCase().includes("kullanici mevcut"));

      const needsRegistration =
        data?.requiresRegistration === true ||
        data?.needsRegistration === true ||
        data?.completeProfile === true ||
        data?.isNewUser === true ||
        data?.registered === false;
      const successNoToken = (statusOk || dataSuccess || messageIndicatesSuccess) && !hasAccessToken;
      const hasTokenButNewUser = hasAccessToken && needsRegistration;

      if (isExistingUser) {
        toast.info(
          "Bu telefon numarasi kayitli. Giris sayfasina yonlendiriliyorsunuz.",
        );
        navigate("/login", { replace: true });
        return { success: true, shouldRedirectToLogin: true };
      }

      if (needsRegistration || successNoToken || hasTokenButNewUser) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      if (hasAccessToken) {
        authService.storeTokensSilent(data.accessToken, data.refreshToken);
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      }

      toast.error("OTP doğrulanamadı");
      return { success: false };
    } catch (error: unknown) {
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
      let response;
      try {
        response = await axiosPrivate.post(authEndPoint.register, data);
      } catch (firstError: any) {
        const backendMessage = String(
          firstError?.response?.data?.message ||
            firstError?.response?.data?.error ||
            firstError?.message ||
            ""
        ).toLowerCase();

        // Backward compatibility: some backend snapshots do not accept accountType in register DTO.
        if (
          data.accountType &&
          (backendMessage.includes("accounttype") ||
            backendMessage.includes("should not exist") ||
            backendMessage.includes("property accounttype"))
        ) {
          const fallbackPayload = { ...data } as RegisterData;
          delete fallbackPayload.accountType;
          response = await axiosPrivate.post(authEndPoint.register, fallbackPayload);
        } else {
          throw firstError;
        }
      }
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
            } catch {
              // no-op
            }
            toast.success(`Kayıt başarılı! Hoş geldiniz ${(userResponse as { name?: string }).name}!`);
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
            response.data)) as Record<string, unknown> | undefined;
        if (createdUser && createdUser.id && (createdUser.name || createdUser.userName)) {
          try {
            SecureStorage.setSessionItem("userId", String(createdUser.id));
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth:user", { detail: createdUser }));
            }
          } catch {
            // no-op
          }
          toast.success(`Kayıt başarılı! Hoş geldiniz ${String(createdUser?.name ?? createdUser?.userName)}!`);
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
              const uid = userResponse?.id ?? userResponse?.userId;
              if (uid) {
                SecureStorage.setSessionItem("userId", String(uid));
              }
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("auth:user", { detail: userResponse }));
              }
            } catch {
              // no-op
            }
            toast.success("Kayıt başarılı! Hoş geldiniz!");
            navigate("/", { replace: true });
            return { success: true, shouldNavigate: true };
          }
        } catch {
          // Swallow and continue to generic success
        }

        // Fallback: generic success without user hydration
        toast.success("Kayıt başarılı");
        navigate("/", { replace: true });
        return { success: true, shouldNavigate: true };
      }
      return { success: false };
    } catch (error: unknown) {
      console.error("Registration error:", error);
      toast.error(getApiErrorMessage(error, "Kayıt başarısız"));
      return { success: false };
    }
  },
};

// Auth service for handling authentication flows

