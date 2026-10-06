import { useAuth } from '@/contexts/AuthContext';
import { useOwnAccess } from '@/hooks/use-content-access';
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMembershipLanguage, type MembershipLanguage } from "@/hooks/use-membership-language";
import {
  subscriptionService,
  subscriptionStatusQueryKey,
} from "@/services/subscription.service";

const COPY = {
  tr: {
    title: "Üyeliğim",
    language: "Üyelik bölümünün dilini seç",
    loading: "Üyelik bilgileri yükleniyor…",
    error: "Üyelik bilgileri alınamadı.",
    retry: "Tekrar dene",
    active: "Üyeliğiniz aktif",
    until: (date: string) => `${date} tarihine kadar`,
    writing: "Yazma Mock",
    speaking: "Konuşma Mock",
    practice: "Ortak Pratik Hakkı",
    remaining: "Kalan Haklarınız",
    note: "Pratik haklarını Yazma ve Konuşma arasında istediğiniz gibi kullanabilirsiniz. Okuma ve Dinleme sınırsızdır.",
    renewal: "Tam üyelik ücretini yeniden ödediğinizde yeni 30 günlük dönem hemen başlar ve tüm haklar yenilenir. Kalan günler ve haklar yeni döneme eklenmez.",
    renew: "Yenile",
    inactive: "Aktif üyeliğiniz yok. Yazma ve konuşma değerlendirmelerini kullanmak için 30 günlük üyelik alabilirsiniz.",
    frozen: (count: number) => `${count} ek hakkınız üyelik yenilenene kadar bekliyor.`,
    details: "Abone Ol",
  },
  uz: {
    title: "Mening obunam",
    language: "Ma’lumot tilini tanlang",
    loading: "Obuna ma’lumotlari yuklanmoqda…",
    error: "Obuna ma’lumotlarini olib bo‘lmadi.",
    retry: "Qayta urinib ko‘rish",
    active: "Obunangiz faol",
    until: (date: string) => `${date} gacha`,
    writing: "Yozish Sinov Imtihoni",
    speaking: "Gapirish Sinov Imtihoni",
    practice: "Umumiy Mashq Imkoniyati",
    remaining: "Qolgan baholash imkoniyatlari",
    note: "Mashqlar uchun berilgan imkoniyatlarni yozish va gapirish o‘rtasida o‘zingiz taqsimlaysiz. O‘qish va tinglash cheklanmagan.",
    renewal: "Obunaning to‘liq narxini yana to‘lasangiz, yangi 30 kun darhol boshlanadi va barcha imkoniyatlar yangilanadi. Qolgan kunlar va imkoniyatlar yangi obunaga qo‘shilmaydi.",
    renew: "Obunani yangilash",
    inactive: "Hozir faol obunangiz yo‘q. Yozish va gapirish javoblaringizni baholatish uchun 30 kunlik obuna olishingiz mumkin.",
    frozen: (count: number) => `${count} ta qo‘shimcha imkoniyatingizdan obunani uzaytirganingizdan keyin foydalanishingiz mumkin.`,
    details: "Obuna haqida",
  },
};

const formatDate = (value: string | null, language: MembershipLanguage) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language === "uz" ? "uz-UZ" : "tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export function SubscriptionStatusCard() {
  const { user } = useAuth();
  const gifted = useOwnAccess();
  const [language, setLanguage] = useMembershipLanguage();
  const copy = COPY[language];
  const status = useQuery({
    queryKey: user?.id ? [...subscriptionStatusQueryKey, user.id] : subscriptionStatusQueryKey,
    queryFn: subscriptionService.getStatus,
    retry: 1,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  return (
    <Card className="rounded-xl border border-[var(--tm-border-subtle)] bg-white text-black shadow-none">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle>{copy.title}</CardTitle>
        <div className="flex gap-1" role="group" aria-label={copy.language}>
          {(["tr", "uz"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={language === option} onClick={() => setLanguage(option)} className={`min-h-9 rounded-md border border-black/15 px-3 text-sm font-semibold uppercase ${language === option ? "bg-[#e5e5e5]" : "bg-white hover:bg-[#f5f5f4]"}`}>
              {option}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-black">
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
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">{copy.active}</p>
              {status.data.periodEnd && <p>{copy.until(formatDate(status.data.periodEnd, language) ?? "")}</p>}
            </div>
            <p className="font-medium">{copy.remaining}</p>
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
            <p className="leading-6">{copy.note}</p>
            <p className="leading-6">{copy.renewal}</p>
            <Link className="inline-flex min-h-10 items-center rounded-lg bg-black px-4 py-2 font-semibold text-white hover:bg-[#262626]" to="/app/fiyatlar#fiyatlandirma">
              {copy.renew}
            </Link>
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
        {gifted.data?.map(grant => <section key={grant.id} className="border-t border-[var(--tm-border-subtle)] pt-4" aria-label="Hediye platform erişimi">
          <h3 className="font-semibold">Hediye platform erişimi</h3>
          <p>{new Date(grant.endsAt).toLocaleString(language === 'uz' ? 'uz-UZ' : 'tr-TR')} tarihine kadar</p>
          <p>Yazma Mock: {grant.remaining.MOCK_WRITING ?? 0} · Konuşma Mock: {grant.remaining.MOCK_SPEAKING ?? 0} · Ortak Pratik: {grant.remaining.PRACTICE_AI ?? 0}</p>
          <p className="mt-1 text-xs text-[#777570]">Satın alınmış üyeliğinizin süresi ve haklarından ayrıdır.</p>
        </section>)}
        {gifted.isError && <p role="status">Hediye erişim bilgileri alınamadı.</p>}
      </CardContent>
    </Card>
  );
}
