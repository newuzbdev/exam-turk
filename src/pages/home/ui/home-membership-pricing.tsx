import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService, subscriptionStatusQueryKey } from "@/services/subscription.service";
import { StudentPageShell, tm } from "@/components/tm";

const COPY = {
  tr: {
    title: "Abonelik",
    intro: "Okuma ve Dinleme’de sınırsız çalışın. Yazma ve Konuşma’da Pratik yapın.",
    label: "30 Günlük Abonelik",
    buy: "Abone Ol",
    renew: "Yenile",
    loading: "Abonelik bilgileri yükleniyor…",
    error: "Abonelik bilgileri alınamadı.",
    retry: "Tekrar dene",
    writing: "Yazma Mock",
    speaking: "Konuşma Mock",
    practice: "Ortak Pratik Hakkı",
    practiceSkills: "Yazma ve Konuşma",
    unlimited: "Okuma ve Dinleme",
    unlimitedValue: "Sınırsız",
    mockType: "Mock Test",
    practiceType: "Pratik",
    note: "Pratik haklarını Yazma ve Konuşma arasında istediğiniz gibi kullanabilirsiniz. Her değerlendirme bir hak kullanır.",
    renewalTitle: "Haklar Nasıl Yenilenir?",
    renewal: "Haklarınız bittiğinde tam abonelik ücretini yeniden ödeyebilirsiniz. Yeni 30 gün hemen başlar ve tüm haklar yenilenir. Kalan günler ve haklar yeni döneme eklenmez.",
    confirm:
      "Yeniden ödeme yeni 30 günlük dönemi hemen başlatır ve mevcut hakları yeni paketle değiştirir. Devam etmek istiyor musunuz?",
  },
};

export default function HomeMembershipPricing({ workspaceMode = false }: { workspaceMode?: boolean }) {
  const [busy, setBusy] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const config = useQuery({
    queryKey: ["subscription", "config"],
    queryFn: subscriptionService.getConfig,
    retry: 1,
  });
  const membership = useQuery({
    queryKey: subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    enabled: isAuthenticated,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
  });
  const copy = COPY.tr;
  const start = async () => {
    if (!isAuthenticated) {
      navigate("/login?returnTo=/app/fiyatlar");
      return;
    }
    setBusy(true);
    try {
      const status = await subscriptionService.getStatus();
      if (status.isActive && !window.confirm(copy.confirm)) return;
      const checkout = await subscriptionService.prepareCheckout();
      const url = new URL(checkout.checkoutUrl);
      if (url.protocol !== "https:") throw new Error("Invalid checkout URL");
      window.location.assign(url.toString());
    } catch {
      toast.error("Ödeme başlatılamadı. Lütfen yeniden deneyin.");
    } finally {
      setBusy(false);
    }
  };
  const pricingCard = (
    <div className={`${tm.card} overflow-hidden`}>
      {config.isPending ? (
        <p role="status" className="p-6 text-base">
          {copy.loading}
        </p>
      ) : config.isError ? (
        <div className="p-6 text-base">
          <p role="status">{copy.error}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => void config.refetch()}
          >
            {copy.retry}
          </button>
        </div>
      ) : config.data ? (
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3 lg:gap-5">
          <div className="flex min-w-0 flex-col rounded-lg border border-[var(--tm-border-subtle)] bg-white p-5">
            <h3 className="text-base font-semibold leading-6">{copy.unlimited}</h3>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{copy.unlimitedValue}</p>
            <dl className="mt-6 space-y-3 border-t border-[var(--tm-border-subtle)] pt-4 lg:mt-auto">
              {[copy.mockType, copy.practiceType].map((label) => (
                <div key={label} className="flex min-h-6 items-center justify-between gap-4">
                  <dt className="text-sm font-medium leading-5">{label}</dt>
                  <dd className="shrink-0">
                    <InfinityIcon className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
                    <span className="sr-only">{copy.unlimitedValue}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex min-w-0 flex-col rounded-lg bg-[#f2f8fd] p-5">
            <h3 className="text-base font-semibold leading-6">{copy.practiceSkills}</h3>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{config.data.plan.quotas.PRACTICE_AI}</p>
            <p className="mt-2 text-sm font-medium leading-5">{copy.practice}</p>
            <dl className="mt-6 space-y-3 border-t border-[var(--tm-border-subtle)] pt-4">
              {[
                [copy.writing, config.data.plan.quotas.MOCK_WRITING],
                [copy.speaking, config.data.plan.quotas.MOCK_SPEAKING],
              ].map(([label, count]) => (
                <div key={label} className="flex min-h-6 items-center justify-between gap-4">
                  <dt className="text-sm font-medium leading-5">{label}</dt>
                  <dd className="shrink-0 text-right text-base font-semibold tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex min-w-0 flex-col rounded-lg bg-[var(--tm-bg-sidebar)] p-5">
            <h3 className="text-base font-semibold leading-6">{copy.label}</h3>
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-3xl font-semibold tracking-tight">
              {new Intl.NumberFormat("tr-TR").format(config.data.plan.baseMonthlyPriceUzs)}
              <span className="text-base font-medium tracking-normal">so‘m</span>
            </p>
            <div className="mt-auto pt-6">
              <button
                type="button"
                disabled={busy || !config.data.paymentConnected}
                onClick={() => void start()}
                className="flex min-h-12 w-full items-center justify-center rounded-lg bg-[#dc2626] px-3 py-3 text-base font-semibold text-white transition-colors hover:bg-[#b91c1c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#dc2626] disabled:cursor-not-allowed"
              >
                {isAuthenticated && membership.data?.isActive ? copy.renew : copy.buy}
              </button>
            </div>
          </div>
          <div className="border-t border-[var(--tm-border-subtle)] pt-4 lg:col-span-3">
            <p className="mb-4 text-sm leading-6">{copy.note}</p>
            <h3 className="text-sm font-semibold leading-5">{copy.renewalTitle}</h3>
            <p className="mt-2 text-sm leading-6">{copy.renewal}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
  if (workspaceMode) {
    return (
      <div id="fiyatlandirma">
        <StudentPageShell title={copy.title} description={copy.intro}>
          {pricingCard}
        </StudentPageShell>
      </div>
    );
  }
  return (
    <section id="fiyatlandirma" className="bg-white px-4 pt-5 pb-24 text-[var(--tm-text-primary)] sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[960px]">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[760px]">
            <h2 className={tm.h2}>{copy.title}</h2>
            <p className="mt-2 text-base leading-6 text-[var(--tm-text-secondary)]">{copy.intro}</p>
          </div>
        </header>
        {pricingCard}
      </div>
    </section>
  );
}
