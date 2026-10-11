import { useAuth } from '@/contexts/AuthContext';
import { useOwnAccess } from '@/hooks/use-content-access';
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  subscriptionService,
  subscriptionStatusQueryKey,
} from "@/services/subscription.service";

const COPY = {
  title: "Üyeliğiniz",
  loading: "Üyelik bilgileri yükleniyor…",
  error: "Üyelik bilgileri alınamadı.",
  retry: "Tekrar dene",
  until: (date: string) => `${date} tarihine kadar`,
  writing: "Yazma Mock",
  speaking: "Konuşma Mock",
  practice: "Ortak Pratik Hakkı",
  remaining: "Kalan Haklarınız",
  note: "Pratik hakları yazma ve konuşma için ortaktır.",
  renew: "Yenile",
  inactive: "Aktif üyeliğiniz yok. Yazma ve konuşma değerlendirmelerini kullanmak için üyelik paketi alabilirsiniz.",
  frozen: (count: number) => `${count} ek hakkınız üyelik yenilenene kadar bekliyor.`,
  details: "Abone Ol",
  gift: "Hediye haklar",
  giftNote: "Üyelik haklarınızdan ayrıdır.",
  giftError: "Hediye hakları yüklenemedi.",
  giftPractice: "Pratik",
};

const MEMBERSHIP_TIME_ZONE = "Asia/Tashkent";

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: MEMBERSHIP_TIME_ZONE,
  }).format(date);
};

export function SubscriptionStatusCard() {
  const { user } = useAuth();
  const gifted = useOwnAccess();
  const copy = COPY;
  const status = useQuery({
    queryKey: user?.id ? [...subscriptionStatusQueryKey, user.id] : subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  return (
    <>
    <Card className="rounded-xl border border-[var(--tm-border-subtle)] bg-white text-black shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-lg">{copy.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm text-black">
        {status.isPending ? (
          <p role="status">{copy.loading}</p>
        ) : status.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p role="status">{copy.error}</p>
            <button type="button" className="font-medium underline" onClick={() => void status.refetch()}>
              {copy.retry}
            </button>
          </div>
        ) : status.data.isActive ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="font-medium">{copy.remaining}</p>
              <div className="flex flex-wrap items-center gap-2">
                {formatDate(status.data.periodEnd) && (
                  <time dateTime={status.data.periodEnd ?? undefined} className="text-[#57534e]">
                    {copy.until(formatDate(status.data.periodEnd) ?? "")}
                  </time>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-live="polite">
              {[
                [copy.practice, status.data.practiceRemaining],
                [copy.writing, status.data.writingMockRemaining],
                [copy.speaking, status.data.speakingMockRemaining],
              ].map(([label, remaining], index) => (
                <div key={label} className={`rounded-lg p-4 ${index === 0 ? "bg-[#d3e5ef]" : "bg-[#f5f5f4]"}`}>
                  <dt className="text-sm font-medium">{label}</dt>
                  <dd className="mt-2 text-3xl font-semibold tracking-tight">{remaining}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pt-1">
              <p className="text-[#57534e]">{copy.note}</p>
              <Link className="ml-auto inline-flex min-h-10 shrink-0 items-center rounded-lg bg-brand-red px-4 py-2 font-semibold text-white hover:bg-brand-red-dark" to="/app/fiyatlar#fiyatlandirma">
                {copy.renew}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="leading-6">{copy.inactive}</p>
            {status.data.frozenAddOnAssessmentRemaining > 0 && (
              <p>{copy.frozen(status.data.frozenAddOnAssessmentRemaining)}</p>
            )}
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-[#262626]" to="/app/fiyatlar#fiyatlandirma">
              {copy.details}
            </Link>
          </>
        )}

      </CardContent>
    </Card>
    {gifted.data?.map(grant => (
      <Card key={grant.id} className="rounded-xl border border-[var(--tm-border-subtle)] bg-white text-black shadow-none" aria-label={copy.gift}>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <CardTitle className="text-lg">{copy.gift}</CardTitle>
          {formatDate(grant.endsAt) && (
            <time dateTime={grant.endsAt} className="text-xs text-[#57534e]">
              {copy.until(`${formatDate(grant.endsAt)} · ${new Intl.DateTimeFormat("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: MEMBERSHIP_TIME_ZONE,
              }).format(new Date(grant.endsAt))}`)}
            </time>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-1 gap-3 rounded-lg bg-[#fafaf9] p-4 sm:grid-cols-3">
            {[
              [copy.giftPractice, grant.remaining.PRACTICE_AI ?? 0],
              [copy.writing, grant.remaining.MOCK_WRITING ?? 0],
              [copy.speaking, grant.remaining.MOCK_SPEAKING ?? 0],
            ].map(([label, remaining]) => (
              <div key={label} className="flex items-center justify-between gap-3 sm:block">
                <dt className="text-xs text-[#57534e]">{label}</dt>
                <dd className="text-lg font-semibold sm:mt-1">{remaining}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-[#57534e]">{copy.giftNote}</p>
        </CardContent>
      </Card>
    ))}
    {gifted.isError && <Card className="rounded-xl border border-[var(--tm-border-subtle)] bg-white shadow-none">
      <CardContent className="pt-6"><p role="status" className="text-sm">{copy.giftError}</p></CardContent>
    </Card>}
    </>
  );
}
