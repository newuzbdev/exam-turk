import { useQuery, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

// Navigation data lives only in this QueryClient, never localStorage or a CDN.
// Do not use this policy for authorization, checkout or active exam sessions.
export const PAGE_DATA_FRESH_MS = 60_000;
export const PAGE_DATA_RETENTION_MS = 10 * 60_000;

export const pageDataKey = (key: QueryKey, ownerId?: string | null) =>
  [...key, 'owner', ownerId ?? null] as const;

export function usePageDataQuery<T>(options: UseQueryOptions<T>) {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  return useQuery({
    staleTime: PAGE_DATA_FRESH_MS,
    gcTime: PAGE_DATA_RETENTION_MS,
    ...options,
    queryKey: pageDataKey(options.queryKey, ownerId),
    meta: { ...options.meta, persist: false, pageData: true, ownerId },
  });
}
