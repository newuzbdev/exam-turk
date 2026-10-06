export const authEndPoint = {
  googleCallback: "/api/auth/google/redirect",
  me: "/api/auth/me",
  login: "/api/user/login",
  register: "/api/user/register",
  passwordReset: "/api/user/password-reset",
  passwordResetConfirm: "/api/user/password-reset/confirm",
  otpSend: "/api/otp/send",
  otpVerify: "/api/otp/verify",
  user: "/api/user", // For getting user by ID: /api/user/{id}
  logout: "/api/user/logout",
  telegramInit: "/api/auth/telegram/init",
  telegramVerifyCode: "/api/auth/telegram/verify-code",
  telegramWidget: "/api/auth/telegram/widget",
};

export const writingEndPoint = {
  writingSubmission: "/api/writing-submission",
  writingSubmissionAll: "/api/writing-submission",
  writingSubmissionById: (id: string) => `/api/writing-submission/${id}`,
  writingSubmissionByUserId: "/api/writing-submission/user",
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

export const readingPracticeEndPoint = {
  getAll: "/api/reading-practice",
  getCompletions: "/api/reading-practice/me/completions",
  getById: (id: string) => `/api/reading-practice/${id}`,
  solve: (id: string, attemptId: string) => `/api/reading-practice/${id}/solve?attemptId=${encodeURIComponent(attemptId)}`,
  start: (id: string) => `/api/reading-practice/${id}/start`,
  check: (id: string) => `/api/reading-practice/${id}/check`,
  submit: (id: string) => `/api/reading-practice/${id}/submit`,
  getAttempt: (attemptId: string) => `/api/reading-practice/attempt/${attemptId}`,
  aiHelp: (id: string) => `/api/reading-practice/${id}/ai-help`,
}
