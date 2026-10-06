import { SecureStorage } from "./secureStorage";

const readToken = (keys: string[]): string | null => {
  // The persistent copy is shared by new tabs and contains the latest renewal.
  for (const key of keys) {
    const token = SecureStorage.getItem(key);
    if (token) return token;
  }
  for (const key of keys) {
    const token = SecureStorage.getSessionItem(key);
    if (token) return token;
  }
  return null;
};

export const readStoredAccessToken = () =>
  readToken(["accessToken", "token", "authToken"]);
export const readStoredRefreshToken = () => readToken(["refreshToken"]);

export const storeRenewedAccessToken = (token: string) => {
  for (const key of ["accessToken", "token"]) {
    SecureStorage.setItem(key, token);
    SecureStorage.setSessionItem(key, token);
  }
};
