export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://api.turkishmock.uz";

export const toApiUrl = (pathOrUrl?: string | null): string => {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;

  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${API_BASE_URL}${normalizedPath}`;
};
