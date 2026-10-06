import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { billingService } from "@/services/billing.service";
export function useBillingPurchases() {
  const { user, isAuthenticated } = useAuth();
  const client = useQueryClient();
  const owner = user?.id;
  useEffect(() => {
    const refresh = () => {
      void client.invalidateQueries({
        queryKey: ["billing", "purchases", owner],
      });
      void client.invalidateQueries({
        queryKey: ["subscription", "status", owner],
      });
    };
    window.addEventListener("access:allowance-changed", refresh);
    return () =>
      window.removeEventListener("access:allowance-changed", refresh);
  }, [client, owner]);
  return useQuery({
    queryKey: ["billing", "purchases", owner],
    queryFn: billingService.getOwnPurchases,
    enabled: !!owner && isAuthenticated,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: 1,
  });
}
