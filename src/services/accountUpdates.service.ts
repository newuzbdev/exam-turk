import axios from "axios";
import sharedApi from "@/config/api";
import { readStoredAccessToken } from "@/utils/authTokenStorage";
import type { AccountNotice } from "@/utils/account-notice-state";
const transport = axios.create({
  baseURL: sharedApi.defaults.baseURL,
  timeout: 5000,
  withCredentials: false,
});
// Own-user boundary is checked before and after an immutable-token request.
export async function getOwnAccountUpdates(
  userId: string,
  signal: AbortSignal,
): Promise<AccountNotice[]> {
  const owner = () =>
    !signal.aborted && sessionStorage.getItem("userId") === userId;
  if (!owner()) throw new Error("Account changed");
  const token = readStoredAccessToken();
  if (!token) throw new Error("No session");
  const response = await transport.get("/api/me/account-updates", {
    signal,
    headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" },
  });
  if (!owner()) throw new Error("Account changed");
  const data = response.data;
  if (data?.success !== true || !Array.isArray(data.data?.items))
    throw new Error("Updates unavailable");
  return data.data.items
    .slice(0, 25)
    .filter(
      (item: AccountNotice) =>
        typeof item?.id === "string" &&
        typeof item?.title === "string" &&
        typeof item?.body === "string" &&
        typeof item?.occurredAt === "string",
    );
}
