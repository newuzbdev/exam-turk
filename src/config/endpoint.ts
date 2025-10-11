export const authEndPoint = {
  googleCallback: "/api/auth/google/redirect",
  me: "/api/auth/me",
  login: "/api/user/login",
  register: "/api/user/register",
  otpSend: "/api/otp/send",
  otpVerify: "/api/otp/verify",
  user: "/api/user", // For getting user by ID: /api/user/{id}
  logout: "/api/auth/logout",
};

export const writingEndPoint = {
  writingSubmission: "/api/writing-submission",
  writingSubmissionAll: "/api/writing-submission",
  writingSubmissionById: (id: string) => `/api/writing-submission/${id}`,
  writingSubmissionByUserId: (userId: string) => `/api/writing-submissions/user/${userId}`,
}

export const paymeEndPoint = {
  checkout: "/api/payme/checkout",
  balance: "/api/payme/balance",
  transaction: (id: string) => `/api/payme/transaction/${id}`,
  verify: "/api/payme/verify",
}

export const bannerEndPoint = {
  create: "/api/banner",
  getAll: "/api/banner",
  getById: (id: string) => `/api/banner/${id}`,
  update: (id: string) => `/api/banner/${id}`,
  delete: (id: string) => `/api/banner/${id}`,
}