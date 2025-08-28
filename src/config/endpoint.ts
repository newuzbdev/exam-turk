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