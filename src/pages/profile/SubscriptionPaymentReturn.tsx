import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  subscriptionService,
  subscriptionStatusQueryKey,
} from "@/services/subscription.service";

export default function SubscriptionPaymentReturn() {
  const [params] = useSearchParams();
  const intentId = params.get("intentId") || "";
  const valid = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(intentId);
  const [waiting, setWaiting] = useState(true);
  const client = useQueryClient();
  useEffect(() => {
    const timer = window.setTimeout(() => setWaiting(false), 120_000);
    return () => window.clearTimeout(timer);
  }, []);
  const payment = useQuery({
    queryKey: ["subscription", "payment-intent", intentId],
    queryFn: () => subscriptionService.getPaymentIntent(intentId),
    enabled: valid,
    retry: false,
    staleTime: 0,
    refetchInterval: (query) =>
      waiting && query.state.data?.status === "PENDING" ? 3000 : false,
  });
  useEffect(() => {
    if (payment.data?.status === "PAID" || payment.data?.status === "CANCELLED")
      void client.invalidateQueries({ queryKey: subscriptionStatusQueryKey });
  }, [payment.data?.status, client]);
  const message = !valid
    ? "Ödeme referansı bulunamadı."
    : payment.isError
      ? "Ödeme durumu alınamadı. Profilinizden üyeliğinizi kontrol edebilirsiniz."
      : payment.data?.status === "PAID"
        ? "Ödemeniz doğrulandı. Güncel haklarınızı profilinizden görebilirsiniz."
        : payment.data?.status === "CANCELLED"
          ? "Bu ödeme iptal edildi."
          : waiting
            ? "Ödeme onayı bekleniyor. Onay geldikten sonra haklarınız yenilenecek."
            : "Ödeme onayı henüz gelmedi. Ödeme yaptıysanız tekrar satın almadan önce üyeliğinizi kontrol edin.";
  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-xl font-semibold">Üyelik ödemesi</h1>
      <p role="status" className="mt-4 text-sm leading-6">
        {message}
      </p>
      <Link to="/app/profil" className="mt-5 inline-block text-sm underline">
        Üyeliğimi kontrol et
      </Link>
    </section>
  );
}
