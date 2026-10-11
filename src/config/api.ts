import axios from "axios";
import {
  readStoredAccessToken,
  readStoredRefreshToken,
  storeRenewedAccessToken,
} from "@/utils/authTokenStorage";
import { requestReauthentication } from "@/utils/authSessionRecovery";
import { AUTH_REQUEST_TIMEOUT_MS } from "@/utils/authConnectionRecovery";

const baseURL =
  import.meta.env.VITE_API_URL || "https://api.turkishmock.uz";

export const resolveApiResourceUrl = (value: string): string => {
  const resourceUrl = String(value || "").trim();
  if (!resourceUrl) return "";

  try {
    const normalizedBase = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
    return new URL(resourceUrl, normalizedBase).toString();
  } catch {
    return resourceUrl;
  }
};

const axiosPrivate = axios.create({
  baseURL,
  // withCredentials: true,
});

const isApiDebugEnabled = import.meta.env.VITE_DEBUG_API === "true";

const debugApi = (...args: unknown[]) => {
  if (isApiDebugEnabled) {
    console.debug(...args);
  }
};

const extractAccessTokenFromPayload = (payload: unknown): string | null => {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const nested = data.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {};
  const accessToken =
    data.accessToken || data.access_token || data.token ||
    nested.accessToken || nested.access_token || nested.token;
  return typeof accessToken === "string" && accessToken ? accessToken : null;
};

const isAuthenticationEntry = (url: string = "") =>
  /\/api\/(?:user\/(?:login|register|refresh|password-reset(?:\/confirm)?)|otp\/(?:send|verify)|auth\/(?:google\/redirect|telegram\/(?:init|verify-code|widget)))(?:\?|$)/.test(url);

let refreshRequest: Promise<string> | null = null;
let refreshRequestToken: string | null = null;
const requestSessions = new WeakMap<object, string | null>();

const renewAccessToken = (): Promise<string> => {
  const refreshToken = readStoredRefreshToken();
  if (refreshRequest && refreshRequestToken === refreshToken) return refreshRequest;
  if (!refreshToken) {
    requestReauthentication();
    return Promise.reject({ response: { status: 401 } });
  }
  const pending = (async () => {
    try {
      const response = await axios.post(
        `${baseURL}/api/user/refresh`,
        { refreshToken },
        // Refresh authentication is carried in JSON. Cookie credentials would
        // make the API's wildcard CORS response unreadable in the browser.
        { withCredentials: false, timeout: AUTH_REQUEST_TIMEOUT_MS },
      );
      if (readStoredRefreshToken() !== refreshToken) {
        throw new Error("Oturum değişti. İsteği yeniden deneyin.");
      }
      const token = extractAccessTokenFromPayload(response.data);
      if (!token) throw new Error("Oturum yenileme yanıtı eksik.");
      storeRenewedAccessToken(token);
      return token;
    } catch (error) {
      if (readStoredRefreshToken() !== refreshToken) {
        throw new Error("Oturum değişti. İsteği yeniden deneyin.");
      }
      if (
        axios.isAxiosError(error) && error.response?.status === 401
      ) {
        requestReauthentication();
      }
      // A failed connection/5xx is not proof that the session is invalid.
      throw error;
    }
  })();
  refreshRequest = pending;
  refreshRequestToken = refreshToken;
  void pending.finally(() => {
    if (refreshRequest === pending) {
      refreshRequest = null;
      refreshRequestToken = null;
    }
  }).catch(() => undefined);
  return pending;
};

// Request interceptor
axiosPrivate.interceptors.request.use(
  (config) => {
    requestSessions.set(config, readStoredRefreshToken());
    debugApi(
      `[API] Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
    );
    const token = readStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      debugApi("[API] Access token attached");
    } else {
      debugApi("[API] No access token found");
    }
    return config;
  },
  (error) => {
    console.error("[API] Request interceptor error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
axiosPrivate.interceptors.response.use(
  (response) => {
    debugApi(
      `[API] Response: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`,
    );
    return response;
  },

  async (error) => {
    if (!error.response) {
      console.error(
        `[API] Network error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
        error.message,
      );
      return Promise.reject(error);
    }

    const eligibilityCode = error.response?.data?.code;
    if (error.response.status === 403 && ["AGE_DECLARATION_REQUIRED", "AGE_INELIGIBLE"].includes(eligibilityCode) &&
      error.config && requestSessions.get(error.config) === readStoredRefreshToken()) {
      window.dispatchEvent(new CustomEvent("auth:eligibility-required", { detail: eligibilityCode }));
      return Promise.reject(error);
    }

    console.error(
      `[API] Request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status}`,
      error.message,
    );

    debugApi("[API] Error response payload:", {
      status: error.response?.status,
      data: error.response?.data,
    });

    // Debug: Check if this is the specific error we're seeing
    if (error.response?.data?.error === "Token not found or expired") {
      debugApi("[API] Detected token expiration error");
      debugApi("[API] Request details:", {
        url: error.config?.url,
        method: error.config?.method,
        hasAuthHeader: !!error.config?.headers?.Authorization,
      });
    }

    const originalRequest = error.config;

    const code = error.response?.data?.code;
    const isTokenError = error.response?.status === 401 &&
      originalRequest && !isAuthenticationEntry(originalRequest.url) &&
      (!code || ["JWT_EXPIRED", "JWT_INVALID", "BEARER_TOKEN_NOT_PROVIDED", "LOGIN_FAILED"].includes(code));

    if (isTokenError && requestSessions.has(originalRequest) &&
      requestSessions.get(originalRequest) !== readStoredRefreshToken()) {
      return Promise.reject(new Error("Oturum değişti. İsteği yeniden deneyin."));
    }
    if (isTokenError && originalRequest._retry) {
      requestReauthentication();
    }

    if (isTokenError && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const currentToken = readStoredAccessToken();
        const sentToken = originalRequest.headers?.Authorization;
        // A late 401 may belong to the token replaced by another request/tab.
        const newAccessToken = currentToken && sentToken !== `Bearer ${currentToken}`
          ? currentToken
          : await renewAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosPrivate(originalRequest);
      } catch (err) {
        console.error("[API] Token renewal failed");
        // Return the actual renewal failure, not the old 401. Exam callers must
        // not mistake a temporary outage for a confirmed need to sign in.
        return Promise.reject(err);
      }
    }

    // Password change required holati
    if (
      error.response?.status === 405 &&
      error.response?.data?.message === "Password Change Requierd" &&
      error.response?.data?.error === "Method Not Allowed"
    ) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default axiosPrivate;
