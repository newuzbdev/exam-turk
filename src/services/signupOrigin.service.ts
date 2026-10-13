import axios from "axios";
import sharedApi from "@/config/api";
import { readStoredAccessToken } from "@/utils/authTokenStorage";
import type { SignupAttribution } from "@/utils/signup-attribution";
const transport = axios.create({
  baseURL: sharedApi.defaults.baseURL,
  timeout: 5000,
  withCredentials: false,
});
export async function captureOwnSignupOrigin(
  userId: string,
  attribution: SignupAttribution,
  signal: AbortSignal,
) {
  const own = () =>
    !signal.aborted && sessionStorage.getItem("userId") === userId;
  if (!own()) throw new Error("Account changed");
  const token = readStoredAccessToken();
  if (!token) throw new Error("No session");
  const body = {
    source: attribution.source,
    ...(attribution.medium ? { medium: attribution.medium } : {}),
    ...(attribution.campaign ? { campaign: attribution.campaign } : {}),
  };
  const response = await transport.post("/api/me/registration-origin", body, {
    signal,
    headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" },
  });
  if (!own()) throw new Error("Account changed");
  if (
    response.data?.success !== true ||
    typeof response.data.data?.recorded !== "boolean"
  )
    throw new Error("Metadata unavailable");
  return response.data.data.recorded as boolean;
}
