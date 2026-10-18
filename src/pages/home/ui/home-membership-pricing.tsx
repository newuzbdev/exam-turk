import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionService, subscriptionStatusQueryKey } from "@/services/subscription.service";
import { billingService, type PackageOffer } from "@/services/billing.service";
import { visibleOffers, renewalConfirmation } from "@/services/billing-view";
import { StudentPageShell, tm } from "@/components/tm";
import BillingPackageCard from "./billing-package-card";

function reservationMessage(offer?: PackageOffer) {
  const campaign = offer?.terms.kind === "MEMBERSHIP" ? offer.campaign : null;
  return campaign?.status === "RESERVED" && campaign.availableUsers === 0 && campaign.reservedUsers > 0
    ? `${campaign.reservedUsers.toLocaleString("tr-TR")} kontenjan ödeme için ayrıldı. Ödeme tamamlanmazsa kontenjan yeniden açılır.`
    : null;
}

export default function HomeMembershipPricing({ workspaceMode = false }: { workspaceMode?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [checkoutNotice, setCheckoutNotice] = useState<
    { kind: "RESERVED"; packageId: string } | { kind: "CHANGED" } | null
  >(null);
  const checkoutPending = useRef(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const catalog = useQuery({
    queryKey: isAuthenticated ? ["billing", "catalog", "owner", user?.id] : ["billing", "catalog", "public"],
    queryFn: isAuthenticated ? billingService.getOwnCatalog : billingService.getCatalog,
    enabled: !isAuthenticated || !!user?.id,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
  const config = useQuery({
    queryKey: ["subscription", "config"], queryFn: subscriptionService.getConfig, retry: 1,
  });
  const membership = useQuery({
    queryKey: [...subscriptionStatusQueryKey, user?.id], queryFn: subscriptionService.getStatus,
    enabled: isAuthenticated, retry: 1, staleTime: 0,
    refetchOnMount: "always", refetchOnWindowFocus: "always",
  });

  async function start(offer: PackageOffer) {
    const reserved = reservationMessage(offer);
    if (reserved) {
      setCheckoutNotice({ kind: "RESERVED", packageId: offer.packageId });
      void catalog.refetch();
      return;
    }
    if (!isAuthenticated) {
      navigate("/login?returnTo=/app/fiyatlar");
      return;
    }
    if (checkoutPending.current) return;
    checkoutPending.current = true;
    setBusy(true);
    setCheckoutNotice(null);
    try {
      if (offer.terms.kind === "MEMBERSHIP") {
        const status = await subscriptionService.getStatus();
        const text = renewalConfirmation(offer, status.isActive);
        if (text && !window.confirm(text)) return;
      }
      const checkout = await billingService.prepareCheckout(offer.packageId, {
        expectedAmountUzs: offer.amountUzs,
        expectedVersionId: offer.versionId,
      });
      const url = new URL(checkout.checkoutUrl);
      if (url.protocol !== "https:") throw new Error("Invalid checkout URL");
      window.location.assign(url.toString());
    } catch (error) {
      if ((error as { response?: { status?: number } } | null)?.response?.status === 409) {
        const refreshed = await catalog.refetch();
        const current = refreshed.data?.find(row => row.packageId === offer.packageId);
        setCheckoutNotice(current && reservationMessage(current)
          ? { kind: "RESERVED", packageId: current.packageId }
          : { kind: "CHANGED" });
      } else {
        toast.error("Ödeme başlatılamadı. Lütfen yeniden deneyin.");
      }
    } finally {
      checkoutPending.current = false;
      setBusy(false);
    }
  }

  const activeMembership = isAuthenticated && !!membership.data?.isActive;
  const checkoutMessage = checkoutNotice?.kind === "RESERVED"
    ? reservationMessage(catalog.data?.find(row => row.packageId === checkoutNotice.packageId))
    : checkoutNotice?.kind === "CHANGED"
      ? "Fiyat veya kampanya koşulları değişti. Güncel fiyatı kontrol edip satın almak için yeniden tıklayın."
      : null;
  const content = <div className="space-y-5">
    {checkoutMessage && <p role="status" className="rounded-lg border border-[var(--tm-border-subtle)] bg-white p-4 text-sm leading-6">{checkoutMessage}</p>}
    {catalog.isPending ? <p role="status">Paket bilgileri yükleniyor…</p> : catalog.isError ? <div role="alert">
      Paket bilgileri alınamadı. <button type="button" className="underline" onClick={() => { void catalog.refetch(); void config.refetch(); }}>Tekrar dene</button>
    </div> : visibleOffers(catalog.data ?? [], activeMembership).map(offer => <BillingPackageCard
      key={offer.packageId} offer={offer} activeMembership={activeMembership} busy={busy}
      connected={!!config.data?.paymentConnected} onBuy={() => void start(offer)}
    />)}
  </div>;
  const intro = "Mock Test ve Pratik için size uygun paketi seçin.";
  return workspaceMode ? <div id="fiyatlandirma">
    <StudentPageShell title="Abonelik" description={intro}>{content}</StudentPageShell>
  </div> : <section id="fiyatlandirma" className="bg-white px-4 pt-5 pb-24 text-[var(--tm-text-primary)] sm:px-6 sm:py-6 lg:px-8">
    <div className="mx-auto max-w-[960px]">
      <header className="mb-5"><h2 className={tm.h2}>Abonelik</h2><p className="mt-2 text-base leading-6">{intro}</p></header>
      {content}
    </div>
  </section>;
}
