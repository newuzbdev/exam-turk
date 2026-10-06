import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Check, Coins, CreditCard, FileText, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import testCoinPriceService from "@/services/testCoinPrice.service";
import { paymeService } from "@/services/payme.service";
import { useAuth } from "@/contexts/AuthContext";
import { Surface, tm } from "@/components/tm";
import { isSubscriptionBillingEnabled } from "@/config/billing";
import HomeMembershipPricing from "@/pages/home/ui/home-membership-pricing";

const coursePackages = [
  {
    name: "A1-A2",
    title: "Temel Türkçe Paketi",
    price: "Yakında",
    note: "Tek seferlik paket",
    description: "Başlangıç grameri, günlük kullanım ve seviye alıştırmaları.",
    features: ["A1 ve A2 dersleri", "Video, not ve ödev akışı", "Seviye alıştırmaları dahil", "Kaldığın yerden devam et"],
  },
  {
    name: "B1-B2",
    title: "Orta Seviye Paketi",
    price: "Yakında",
    note: "Tek seferlik paket",
    description: "Metin kurma, bağlaçlar, akademik geçiş ve sınava hazırlık.",
    features: ["B1 ve B2 dersleri", "Konu sırasına göre çalışma", "Seviye alıştırmaları dahil", "İlerleme takibi"],
  },
  {
    name: "C1",
    title: "İleri Türkçe Paketi",
    price: "Yakında",
    note: "Tek seferlik paket",
    description: "Akademik dil, nüanslar ve ileri seviye sınav odağı.",
    features: ["C1 dersleri", "İleri gramer notları", "Seviye alıştırmaları dahil", "Sınav odaklı tekrar"],
  },
];

const comparisonRows = [
  ["Gramer dersleri", "Dahil", "Dahil", "Dahil"],
  ["Seviye alıştırmaları", "Dahil", "Dahil", "Dahil"],
  ["Mock test kredisi", "Ayrı", "Ayrı", "Ayrı"],
  ["Sonuç raporu", "Mock test ile", "Mock test ile", "Mock test ile"],
];

export default function Price() {
  if (isSubscriptionBillingEnabled) {
    return <div className={tm.page}><HomeMembershipPricing workspaceMode /></div>;
  }
  return <CoinPrice />;
}

function CoinPrice() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [coinPrices, setCoinPrices] = useState<any[] | null>(null);
  const [coinUnitPrice, setCoinUnitPrice] = useState<number>(1000);
  const { user, refreshUser } = useAuth();
  const currentCoins = user?.coin ?? 0;

  useEffect(() => {
    let mounted = true;
    testCoinPriceService.getAll().then((items) => {
      if (mounted) setCoinPrices(items);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    paymeService.getAllProducts().then((products) => {
      const price = products?.[0]?.price;
      if (mounted && typeof price === "number" && price > 0) {
        setCoinUnitPrice(price);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const coinByType = useMemo(() => {
    const map: Record<string, number> = {};
    (coinPrices || []).forEach((item) => {
      map[item.testType] = item.coin;
    });
    return map;
  }, [coinPrices]);

  const sectionPrices = useMemo(
    () => [
      { label: "Dinleme", key: "LISTENING", coin: coinByType["LISTENING"] ?? 3 },
      { label: "Okuma", key: "READING", coin: coinByType["READING"] ?? 3 },
      { label: "Yazma", key: "WRITING", coin: coinByType["WRITING"] ?? 5 },
      { label: "Konuşma", key: "SPEAKING", coin: coinByType["SPEAKING"] ?? 5 },
    ],
    [coinByType]
  );

  const totalTestCost = useMemo(
    () => sectionPrices.reduce((sum, item) => sum + item.coin, 0),
    [sectionPrices]
  );

  const formatUZS = (value: number) => `${value.toLocaleString("tr-TR")} UZS`;

  const handleCheckoutSuccess = async () => {
    await refreshUser?.();
    setIsCheckoutOpen(false);
  };

  return (
    <div className={tm.page}>
      <section className="border-b border-[var(--tm-border-subtle)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-6xl">
                Ders paketi ve mock kredi.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--tm-text-secondary)] sm:text-lg">
                Dersler paketle açılır; mock testler krediyle bölüm bölüm çözülür.
              </p>
            </div>

            <Surface className="p-4">
              <div className="flex items-center justify-between border-b border-[var(--tm-border-subtle)] pb-3">
                <span className="text-sm font-medium text-[var(--tm-text-secondary)]">Mevcut kredi</span>
                <span className="text-xl font-semibold text-[var(--tm-text-primary)]">{currentCoins}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3">
                <a
                  href="#ders-paketleri"
                  className="rounded-md px-2 py-2 text-sm font-semibold text-[var(--tm-text-primary)] transition-colors hover:bg-[var(--tm-bg-hover)]"
                >
                  Ders paketleri
                </a>
                <a
                  href="#mock-kredileri"
                  className="rounded-md px-2 py-2 text-sm font-semibold text-[var(--tm-text-primary)] transition-colors hover:bg-[var(--tm-bg-hover)]"
                >
                  Mock kredileri
                </a>
              </div>
            </Surface>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section id="ders-paketleri">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-3xl">
                Ders paketleri
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tm-text-secondary)]">
                Alıştırmalar ders paketlerine dahil olacak. Paket satın alma akışı daha sonra bağlanacak.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-md bg-[var(--tm-bg-app)] px-3 py-1.5 text-xs font-medium text-[var(--tm-text-secondary)]">
              <LockKeyhole className="h-3.5 w-3.5" />
              Taslak görünüm
            </span>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {coursePackages.map((item) => (
              <Surface key={item.name} className="group flex min-h-[390px] flex-col p-5 transition-[background-color,border-color] duration-200 hover:border-[var(--tm-border-default)] hover:bg-[var(--tm-bg-hover)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-4xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
                      {item.name}
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--tm-text-primary)]">
                      {item.title}
                    </h3>
                  </div>
                  <BookOpen className="mt-1 h-5 w-5 text-[var(--tm-text-tertiary)]" strokeWidth={2.2} />
                </div>

                <p className="mt-3 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  {item.description}
                </p>

                <div className="mt-5 border-y border-[var(--tm-border-subtle)] py-4">
                  <div className="text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)]">
                    {item.price}
                  </div>
                  <div className="mt-1 text-xs font-medium text-[var(--tm-text-tertiary)]">
                    {item.note}
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  {item.features.map((feature) => (
                    <div key={feature} className="flex gap-3 text-sm leading-5 text-[var(--tm-text-secondary)]">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tm-text-tertiary)]" strokeWidth={2.3} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  disabled
                  className="mt-auto inline-flex h-10 cursor-not-allowed items-center justify-between rounded-md border border-[var(--tm-border-default)] bg-white px-4 text-sm font-semibold text-[var(--tm-text-tertiary)] opacity-75"
                >
                  <span>Satın alma yakında</span>
                  <ArrowRight className="h-4 w-4" strokeWidth={2.3} />
                </button>
              </Surface>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <Surface className="p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-1 h-5 w-5 text-[var(--tm-text-tertiary)]" strokeWidth={2.2} />
              <div>
                <h2 className="text-base font-semibold text-[var(--tm-text-primary)]">Ödeme mantığı</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  Dersler paketle açılır. Alıştırmalar bu paketlerin içinde olur. Mock test ise ayrı kredi sistemiyle kalır.
                </p>
              </div>
            </div>
          </Surface>
        </section>

        <section id="mock-kredileri" className="mt-12">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-3xl">
                Mock test kredileri
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--tm-text-secondary)]">
                Buradaki ödeme mevcut kredi sistemiyle çalışır. İstediğin kadar kredi alıp sadece çözdüğün bölüm kadar harcarsın.
              </p>
            </div>
          </div>

          <Surface className="overflow-hidden">
            <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
              <div className="border-b border-[var(--tm-border-subtle)] bg-[var(--tm-bg-app)] p-5 sm:p-6 lg:border-b-0 lg:border-r">
                <h3 className="text-base font-semibold text-[var(--tm-text-primary)]">Kredi satın al</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  Kredi hesabına eklenir; test başlatırken seçtiğin bölümlere göre düşer.
                </p>

                <div className="mt-6 grid gap-3">
                  <div className="flex items-center justify-between rounded-md bg-white px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--tm-text-secondary)]">
                      <Coins className="h-4 w-4" />
                      1 kredi
                    </span>
                    <span className="text-sm font-semibold text-[var(--tm-text-primary)]">{formatUZS(coinUnitPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-white px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--tm-text-secondary)]">
                      <FileText className="h-4 w-4" />
                      Tam mock
                    </span>
                    <span className="text-sm font-semibold text-[var(--tm-text-primary)]">{totalTestCost} kredi</span>
                  </div>
                </div>

                <Button
                  onClick={() => setIsCheckoutOpen(true)}
                  className={`${tm.primaryButton} mt-5 h-11 w-full px-5 text-sm font-medium`}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Kredi satın al
                </Button>
              </div>

              <div className="p-5 sm:p-6">
                <h3 className="text-base font-semibold text-[var(--tm-text-primary)]">Bölüm ücretleri</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tm-text-secondary)]">
                  Tek bölüm seçersen sadece o bölümün kredisi kullanılır.
                </p>
                <div className="mt-5 overflow-hidden rounded-lg border border-[var(--tm-border-subtle)]">
                {sectionPrices.map((item) => (
                  <div
                    key={item.key}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[var(--tm-border-subtle)] bg-white px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--tm-bg-hover)]"
                  >
                    <span className="text-sm font-medium text-[var(--tm-text-primary)]">{item.label}</span>
                    <span className="text-sm font-semibold text-[var(--tm-text-primary)]">{item.coin} kredi</span>
                    <span className="hidden text-xs font-medium text-[var(--tm-text-tertiary)] sm:inline">
                      {formatUZS(item.coin * coinUnitPrice)}
                    </span>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </Surface>
        </section>

        <section className="mt-12">
          <Surface className="overflow-hidden">
            <div className="border-b border-[var(--tm-border-subtle)] px-5 py-4">
              <h2 className="text-lg font-semibold text-[var(--tm-text-primary)]">Kısa karşılaştırma</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--tm-border-subtle)] text-[var(--tm-text-secondary)]">
                    <th className="px-5 py-3 font-medium">İçerik</th>
                    <th className="px-5 py-3 font-medium">A1-A2</th>
                    <th className="px-5 py-3 font-medium">B1-B2</th>
                    <th className="px-5 py-3 font-medium">C1</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map(([label, a, b, c]) => (
                    <tr key={label} className="border-b border-[var(--tm-border-subtle)] last:border-b-0 hover:bg-[var(--tm-bg-hover)]">
                      <td className="px-5 py-3 font-medium text-[var(--tm-text-primary)]">{label}</td>
                      {[a, b, c].map((value, index) => (
                        <td key={`${label}-${index}`} className="px-5 py-3 text-[var(--tm-text-secondary)]">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        </section>
      </main>

      {isCheckoutOpen && (
        <PaymeCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          planName="Kredi Satın Al"
          planId="quick"
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
