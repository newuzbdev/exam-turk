import axios from "axios";
import { SecureStorage } from "@/utils/secureStorage";

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz";

const axiosPrivate = axios.create({
  baseURL,
  // withCredentials: true,
});

// Request interceptor
axiosPrivate.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 Making request to: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`
    );
    const token = SecureStorage.getSessionItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log("🔑 Token attached to request");
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

    const originalRequest = error.config;

    // 👉 Token eskirgan holatni backend JWT_EXPIRED orqali qaytaradi
    if (
      error.response?.status === 401 &&
      error.response?.data?.error === "JWT_EXPIRED" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(`${baseURL}/api/user/refresh`, {}, { withCredentials: true });
        console.log("🔄 refreshResponse:", refreshResponse.data);

        if (refreshResponse?.data?.accessToken) {
          const newAccessToken = refreshResponse.data.accessToken;
          SecureStorage.setSessionItem("accessToken", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosPrivate(originalRequest);
        }
      } catch (err) {
        console.error("❌ Error refreshing token:", err);
        SecureStorage.removeSessionItem("accessToken");
        window.location.href = "/login";
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
  }
);

export default axiosPrivate;
