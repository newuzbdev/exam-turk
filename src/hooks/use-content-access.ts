import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { accessService, type AccessTarget } from '@/services/access.service';
import { contentAccessKey } from '@/utils/content-access';

export function useAccessConfig() {
  const { user, isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['access-config'], queryFn: accessService.getConfig, enabled: isAuthenticated && Boolean(user?.id), staleTime: Infinity, retry: 1 });
}
export function useContentAccessDecisions(targets: AccessTarget[], shareRedemptionId?: string) {
  const { user, isAuthenticated } = useAuth();
  const config = useAccessConfig();
  const client = useQueryClient();
  const canonical = [...new Map(targets.map(target => [contentAccessKey(target), target])).values()].sort((a,b) => contentAccessKey(a).localeCompare(contentAccessKey(b)));
  const query = useQuery({
    queryKey: ['content-access', user?.id, canonical, shareRedemptionId || null],
    queryFn: async () => {
      const rows = [];
      for (let index = 0; index < canonical.length; index += 100) rows.push(...await accessService.getDecisions(canonical.slice(index,index + 100), undefined, shareRedemptionId));
      return rows;
    },
    enabled: isAuthenticated && Boolean(user?.id) && config.data?.enabled === true && canonical.length > 0,
    staleTime: 0, gcTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: 'always', retry: 1,
    meta: { persist: false },
  });
  useEffect(() => {
    const refresh = () => { void client.invalidateQueries({ queryKey: ['content-access'] }); void client.invalidateQueries({ queryKey: ['own-access'] }); void client.invalidateQueries({ queryKey: ['subscription', 'status'] }); };
    window.addEventListener('access:allowance-changed', refresh);
    return () => window.removeEventListener('access:allowance-changed', refresh);
  }, [client]);
  return { ...query, enabled: config.data?.enabled === true, pending: Boolean(user?.id) && (config.isPending || config.isError || (config.data?.enabled && canonical.length > 0 && query.isPending)), decisionFor: (target: AccessTarget) => query.data?.find(item => contentAccessKey(item.target) === contentAccessKey(target)) };
}
export function useAccessCatalogSummary() {
  const { user } = useAuth();
  const config = useAccessConfig();
  return useQuery({ queryKey: ['access-catalog-summary', user?.id], queryFn: () => accessService.getCatalogSummary(), enabled: Boolean(user?.id) && config.data?.enabled === true, staleTime: 0, gcTime: 0, refetchOnWindowFocus: 'always', meta: { persist: false } });
}
export function useOwnAccess() {
  const { user } = useAuth();
  const config = useAccessConfig();
  return useQuery({ queryKey: ['own-access', user?.id], queryFn: () => accessService.getOwnAccess(), enabled: Boolean(user?.id) && config.data?.enabled === true, staleTime: 0, gcTime: 0, refetchOnWindowFocus: 'always', meta: { persist: false } });
}
