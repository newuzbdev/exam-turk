import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz";

// Create axios instance configured for HttpOnly cookies
const axiosCookie = axios.create({
  baseURL,
  withCredentials: true, // This is crucial for HttpOnly cookies
});

// Request interceptor - no need to manually add Authorization header
axiosCookie.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 Making request to: ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    console.log("🍪 HttpOnly cookies will be automatically included");
    return config;
  },
  (error) => {
    console.error("❌ Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle authentication errors
axiosCookie.interceptors.response.use(
  (response) => {
    console.log(
      `✅ Response received from: ${response.config.method?.toUpperCase()} ${
        response.config.url
      } - Status: ${response.status}`
    );
    return response;
  },

  async (error) => {
    console.error(
      `❌ Request failed: ${error.config?.method?.toUpperCase()} ${
        error.config?.url
      } - Status: ${error.response?.status}`,
      error.message
    );

    const originalRequest = error.config;

    // Handle token expiration
    if (
      error.response?.status === 401 &&
      error.response?.data?.message === "Token has expired" &&
      error.response?.data?.error === "Unauthorized" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        console.log("🔄 Attempting to refresh token via HttpOnly cookies...");

        return axiosCookie(originalRequest);
      } catch (refreshError) {
        console.error("❌ Token refresh failed:", refreshError);

        // Redirect to login if refresh fails
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    // Handle password change required
    if (
      error.response?.status === 405 &&
      error.response?.data?.message === "Password Change Required" &&
      error.response?.data?.error === "Method Not Allowed"
    ) {
      console.log("🔐 Password change required");
      return Promise.reject(error);
    }

    // Handle other authentication errors
    if (error.response?.status === 401) {
      console.log("🚫 Authentication failed - redirecting to login");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default axiosCookie;
