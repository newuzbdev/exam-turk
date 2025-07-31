import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "https://api.turkcetest.uz";
const axiosPrivate = axios.create({
  baseURL,
  withCredentials: true,
});

axiosPrivate.interceptors.request.use(
  (config) => {
    console.log(
      `🚀 Making request to: ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    const token = localStorage.getItem("accessToken");
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

axiosPrivate.interceptors.response.use(
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

    if (
      error.response?.status === 401 &&
      error.response?.data?.message === "Token has expired" &&
      error.response?.data?.error === "Unauthorized" &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axiosPrivate.post("/api/user/refresh");
        console.log("refreshResponse:", refreshResponse);

        if (refreshResponse?.data?.accessToken) {
          const newAccessToken = refreshResponse.data.accessToken;
          localStorage.setItem("accessToken", newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosPrivate(originalRequest);
        }
      } catch (err) {
        console.error("Error refreshing token:", err);
        localStorage.removeItem("accessToken");
        window.location.href = "/login";
        return Promise.reject(err);
      }
    }

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
