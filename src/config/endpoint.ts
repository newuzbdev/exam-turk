// export const userEndPoint = {
//   register: "user/register",
//   login: "user/login",
//   refresh: "user/refresh",
//   logout: "user/logout",
//   getAll: "user",
//   one: (id: string) => `/user/${id}`,
// };

// export const authEndPoint = {
//   // Google OAuth endpoints
//   googleAuth: "/api/auth/google",
//   googleCallback: "/api/auth/google/redirect",

//   // User authentication status
//   me: "/api/auth/me",
//   logout: "/api/auth/logout",

//   // Token refresh
//   refreshToken: "/api/auth/refresh",
// };

// // Base API URL - adjust according to your environment
// export const API_BASE_URL =
//   process.env.NODE_ENV === "production"
//     ? "https://your-production-domain.com"
//     : "http://localhost:3000";
export const userEndPoint = {
  register: "user/register",
  login: "user/login",
  refresh: "user/refresh",
  logout: "user/logout",
  getAll: "user",
  one: (id: string) => `/user/${id}`,
};

export const authEndPoint = {
  // Google OAuth endpoints
  googleAuth: "/api/auth/google",
  googleCallback: "/api/auth/google/redirect",

  // User authentication status
  me: "/api/auth/me",
  logout: "/api/auth/logout",

  // Token refresh
  refreshToken: "/api/auth/refresh",
};

// Base API URL
export const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-production-domain.com"
    : "http://localhost:3000";
