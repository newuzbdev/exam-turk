import { SecureStorage } from "./secureStorage";

export const REAUTHENTICATION_REQUIRED_EVENT = "auth:reauthentication-required";

// Confirmed session rejection may require a fresh login. Keep answers and
// attempt tokens: ordinary logout cleanup would discard recoverable work.
export function requestReauthentication() {
  for (const key of ["accessToken", "token", "authToken", "refreshToken", "userId"]) {
    SecureStorage.removeSessionItem(key);
    SecureStorage.removeItem(key);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(REAUTHENTICATION_REQUIRED_EVENT));
  }
}
