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

  // Helper function to store tokens securely
  storeTokens: (accessToken: string, refreshToken?: string): void => {
    // Store tokens in sessionStorage instead of localStorage for better security
    // They will be cleared when browser/tab is closed
    SecureStorage.setSessionItem("accessToken", accessToken);
    if (refreshToken) {
      SecureStorage.setSessionItem("refreshToken", refreshToken);
    }

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
      if (
        response.data.message === "Kod muvaffaqiyatli tasdiqlandi" ||
        response.data.message?.includes("tasdiqlandi")
      ) {
        toast.success("OTP doğrulandı - Kayıt formunu doldurun");
        return { success: true, phoneNumber: phoneWithPrefix };
      } else {
        toast.error("OTP doğrulanamadı");
        return { success: false };
      }
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
