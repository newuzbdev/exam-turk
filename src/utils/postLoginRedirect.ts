const POST_LOGIN_REDIRECT_KEY = "tm_post_login_redirect_v1";

const BLOCKED_PATH_PREFIXES = ["/login", "/signup", "/oauth-callback"];

const isBlockedPath = (pathname: string): boolean =>
  BLOCKED_PATH_PREFIXES.some(
    (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
  );

export const normalizeRedirectPath = (value?: string | null): string | null => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}` || "/";
    if (!normalized.startsWith("/")) return null;
    if (normalized.startsWith("//")) return null;
    if (isBlockedPath(parsed.pathname)) return null;
    return normalized;
  } catch {
    return null;
  }
};

const readStoredRedirect = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    return normalizeRedirectPath(sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY));
  } catch {
    return null;
  }
};

export const getCurrentPath = (): string => {
  if (typeof window === "undefined") return "/";
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return normalizeRedirectPath(current) || "/";
};

export const setPostLoginRedirect = (target?: string | null): string => {
  const normalized = normalizeRedirectPath(target) || "/";
  if (typeof window !== "undefined") {
    try {
      if (normalized === "/") {
        sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
      } else {
        sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, normalized);
      }
    } catch {
      // no-op
    }
  }
  return normalized;
};

export const resolvePostLoginRedirect = (preferred?: string | null): string =>
  normalizeRedirectPath(preferred) || readStoredRedirect() || "/";

export const consumePostLoginRedirect = (fallback: string = "/"): string => {
  const resolved = resolvePostLoginRedirect(fallback);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    } catch {
      // no-op
    }
  }
  return resolved;
};
