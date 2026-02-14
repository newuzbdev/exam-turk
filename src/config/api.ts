import axios from "axios";
import { SecureStorage } from "@/utils/secureStorage";

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkishmock.uz";

const axiosPrivate = axios.create({
  baseURL,
  // withCredentials: true,
});

const readFirstToken = (keys: string[]): string | null => {
  for (const key of keys) {
    const fromSession = SecureStorage.getSessionItem(key);
    if (fromSession) return fromSession;
    const fromLocal = SecureStorage.getItem(key);
    if (fromLocal) return fromLocal;
  }
  return null;
};

const readAccessToken = (): string | null =>
  readFirstToken(["accessToken", "token", "authToken"]);

const readRefreshToken = (): string | null =>
  readFirstToken(["refreshToken"]);

const extractAccessTokenFromPayload = (payload: any): string | null => {
  const accessToken =
    payload?.accessToken ||
    payload?.access_token ||
    payload?.token ||
    payload?.data?.accessToken ||
    payload?.data?.access_token ||
    payload?.data?.token;
  return accessToken ? String(accessToken) : null;
};

// Request interceptor
axiosPrivate.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 Making request to: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
    const token = readAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token attached to request:", token.substring(0, 20) + "...");
      
      // Debug: Check if token is expired
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        const isExpired = payload.exp < currentTime;
        console.log("🔍 Token expiration check:", {
          exp: payload.exp,
          currentTime,
          isExpired,
          expiresIn: payload.exp - currentTime
        });
      } catch (e) {
        console.error("❌ Error parsing token:", e);
      }
    } else {
      console.log("❌ No token found");
    }
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor
axiosPrivate.interceptors.response.use(
  (response) => {
    console.log(
      `✅ Response received from: ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`
    );
    return response;
  },

  async (error) => {
    console.error(
      `❌ Request failed: ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status}`,
      error.message
    );
    
    // Debug: Log the full error response
    console.log("🔍 Full error response:", {
      status: error.response?.status,
      data: error.response?.data,
      headers: error.response?.headers
    });
    
    // Debug: Check if this is the specific error we're seeing
    if (error.response?.data?.error === "Token not found or expired") {
      console.log("🚨 Detected 'Token not found or expired' error");
      console.log("🔍 Request details:", {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers,
        hasAuthHeader: !!error.config?.headers?.Authorization
      });
    }

    const originalRequest = error.config;

    // 👉 Handle token expiration - check for various error formats
    const isTokenError = error.response?.status === 401 && (
      error.response?.data?.error === "JWT_EXPIRED" ||
      error.response?.data?.error === "Token not found or expired" ||
      error.response?.data?.message === "Token not found or expired" ||
      error.response?.data?.success === false
    );
    
    if (isTokenError && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = readRefreshToken();
        const refreshPayload = refreshToken ? { refreshToken } : {};
        const refreshResponse = await axios.post(
          `${baseURL}/api/user/refresh`,
          refreshPayload,
          { withCredentials: true }
        );
        console.log("🔄 refreshResponse:", refreshResponse.data);

        const newAccessToken = extractAccessTokenFromPayload(refreshResponse?.data);
        if (newAccessToken) {
          SecureStorage.setSessionItem("accessToken", newAccessToken);
          SecureStorage.setItem("accessToken", newAccessToken);
          SecureStorage.setSessionItem("token", newAccessToken);
          SecureStorage.setItem("token", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosPrivate(originalRequest);
        }
      } catch (err) {
        console.error("❌ Error refreshing token:", err);
        // Keep the user on the current page so in-progress test answers are not interrupted.
        // Caller layers handle retry messaging and safe re-submit guidance.
        return Promise.reject(error);
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
  }
);

export default axiosPrivate;
