import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Headphones,
  HelpCircle,
  Layout,
  Mic,
  PenTool,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import PaymeCheckoutModal from "@/components/payme/PaymeCheckoutModal";
import { setPostLoginRedirect } from "@/utils/postLoginRedirect";

type ProcessStep = {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
  points: string[];
};

type SkillCard = {
  title: string;
  detail: string;
  duration: string;
  output: string;
  icon: LucideIcon;
  colorClass: string;
};

const QUICK_FACTS = [
  {
    title: "Toplam Bölüm",
    value: "4",
    description: "Okuma, Dinleme, Yazma, Konuşma",
  },
  {
    title: "Bölüm Ücreti",
    value: "3 Kredi",
    description: "Her bölüm için ayrı ücretlendirme",
  },
  {
    title: "Sonuç Hızı",
    value: "Anında",
    description: "Bölüm tamamlanınca sonuç ekranı hazır",
  },
  {
    title: "Seviye Ölçeği",
    value: "B1-C1",
    description: "CEFR uyumlu değerlendirme",
  },
];

const PROCESS_STEPS: ProcessStep[] = [
  {
    id: 1,
    title: "Giriş Yap ve Profilini Hazırla",
    description:
      "Google veya Telegram ile birkaç saniyede giriş yaparsın. Profil adı ve hesap bilgilerini daha sonra güncelleyebilirsin.",
    icon: UserCheck,
    points: [
      "Yeni hesap açmakla uğraşmadan direkt başla.",
      "Profilindeki isim, sonuç sayfalarında görünür.",
      "Hesabınla tekrar giriş yaptığında geçmişin korunur.",
    ],
  },
  {
    id: 2,
    title: "Kredi Yükle",
    description:
      "Teste başlamadan önce kredi bakiyen yeterli olmalıdır. Ödeme tamamlanınca kredi hesabına otomatik eklenir.",
    icon: CreditCard,
    points: [
      "Kredi satın alma işlemi birkaç adımda tamamlanır.",
      "Bölüm seçimine göre sadece kullandığın kadar kredi harcarsın.",
      "Bakiyeni üst menüden her zaman görebilirsin.",
    ],
  },
  {
    id: 3,
    title: "Sınav Bölümlerini Seç",
    description:
      "Tek bir bölümü çözebilir veya tam deneme için tüm bölümleri tamamlayabilirsin. Sistem seçimine göre seni yönlendirir.",
    icon: Layout,
    points: [
      "Okuma, dinleme, yazma ve konuşma bölümleri ayrı ayrı yönetilir.",
      "Bölüm başlamadan önce talimatları görürsün.",
      "Sınava geçmeden önce kontrol ekranı sunulur.",
    ],
  },
  {
    id: 4,
    title: "Sınavı Gerçek Ortamda Tamamla",
    description:
      "Süre yönetimi, soru düzeni ve akış gerçek sınav mantığına yakın şekilde hazırlanmıştır.",
    icon: Clock,
    points: [
      "Masaüstünde okuma ve dinleme için not alma araçları bulunur.",
      "Cevaplama alanları sade tutulduğu için odak kaybı azalır.",
      "Her bölüm kendi kurallarına uygun ilerler.",
    ],
  },
  {
    id: 5,
    title: "Sonuçları ve Seviyeni İncele",
    description:
      "Sınav bittiğinde puanın, seviye karşılığı ve gelişim alanların ekranda görüntülenir. Sonuç geçmişine profilinden ulaşabilirsin.",
    icon: Target,
    points: [
      "Puanlar ve seviyeler tek ekranda anlaşılır biçimde gösterilir.",
      "Hangi beceride güçlü veya zayıf olduğunu görebilirsin.",
      "Yeni denemelerde gelişimini karşılaştırabilirsin.",
    ],
  },
];

const SKILL_CARDS: SkillCard[] = [
  {
    title: "Okuma",
    detail: "Metin anlama, ana fikir yakalama ve detay çözümleme becerisi ölçülür.",
    duration: "Süreli bölüm",
    output: "Puan + CEFR seviye karşılığı",
    icon: BookOpen,
    colorClass: "text-blue-600 bg-blue-50 border-blue-100",
  },
  {
    title: "Dinleme",
    detail: "Ses kayıtlarını doğru anlama, bağlamı takip etme ve doğru seçenek bulma değerlendirilir.",
    duration: "Süreli bölüm",
    output: "Puan + CEFR seviye karşılığı",
    icon: Headphones,
    colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
  },
  {
    title: "Yazma",
    detail: "Yazının içeriği, dil doğruluğu, kelime kullanımı ve anlatım düzeni analiz edilir.",
    duration: "Süreli bölüm",
    output: "Puan + detaylı geri bildirim",
    icon: PenTool,
    colorClass: "text-amber-600 bg-amber-50 border-amber-100",
  },
  {
    title: "Konuşma",
    detail: "Telaffuz, akıcılık, kelime kullanımı ve yanıt kalitesi bir arada değerlendirilir.",
    duration: "Süreli bölüm",
    output: "Puan + detaylı geri bildirim",
    icon: Mic,
    colorClass: "text-rose-600 bg-rose-50 border-rose-100",
  },
];

const FAQ_ITEMS = [
  {
    q: "Tüm bölümleri aynı gün çözmek zorunda mıyım?",
    a: "Hayır. Bölümleri ayrı ayrı çözebilirsin. Hazır olduğun bölümden başlayıp diğerlerini sonra tamamlayabilirsin.",
  },
  {
    q: "Sonuçlarımı nerede göreceğim?",
    a: "Her bölümden sonra sonuç ekranı açılır. Ayrıca profil sayfandaki geçmiş alanından eski sonuçlarına tekrar ulaşabilirsin.",
  },
  {
    q: "Telefon ve bilgisayar arasında fark var mı?",
    a: "Sınav her iki cihazda da çalışır. Masaüstünde ek not alma araçları bulunduğu için özellikle okuma ve dinlemede daha rahat bir deneyim sunar.",
  },
  {
    q: "Kredi biterse sınavım silinir mi?",
    a: "Hayır. Tamamladığın sonuçlar hesabında kalır. Sadece yeni bir bölüme başlamak için yeterli kredi gerekir.",
  },
];

const HowItWorksPage = () => {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isCoinModalOpen, setIsCoinModalOpen] = useState(false);
  const redirectTo = `${location.pathname}${location.search}${location.hash}` || "/";

  const currentCoin = user?.coin ?? 0;
  const isLoggedIn = Boolean(isAuthenticated && user);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <section className="relative overflow-hidden border-b border-gray-200 bg-white pb-16 pt-24">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-20 -right-16 h-56 w-56 rounded-full bg-red-100 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-orange-100 blur-3xl" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-red-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Platform Rehberi
              </span>
            </div>

            <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-gray-900 md:text-6xl">
              TURKISHMOCK
              <span className="block text-red-600">Nasıl Çalışır?</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-gray-600 md:text-lg">
              Bu sayfa, platformu ilk kez kullanan birinin bile hiçbir adımı
              kaçırmadan sınava başlayabilmesi için hazırlandı. Kısa özet, adım
              adım süreç ve sık sorulan soruların tamamı burada.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <NavLink to="/test">
                <Button className="h-12 rounded-xl bg-red-600 px-7 text-base font-semibold text-white hover:bg-red-700">
                  Teste Başla
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </NavLink>
              <NavLink to="/price">
                <Button
                  variant="outline"
                  className="h-12 rounded-xl border-gray-300 bg-white px-7 text-base font-semibold text-gray-800 hover:bg-gray-50"
                >
                  Fiyatları Gör
                </Button>
              </NavLink>
            </div>
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
              <span className="text-sm font-semibold text-gray-700">
                Mevcut Bakiye
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-sm font-bold text-gray-900">
                <Coins className="h-4 w-4" />
                {currentCoin}
              </span>
            </div>

            <h2 className="text-lg font-semibold text-gray-900">
              Hızlı Başlangıç
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Giriş yap, kredini kontrol et ve sınav türünü seçerek hemen
              başlayabilirsin.
            </p>

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-red-600" />
                Hesabına giriş yap
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-red-600" />
                Kredi bakiyeni doğrula
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-red-600" />
                Bölüm seçip sınavı başlat
              </div>
            </div>

            <div className="mt-5">
              {isLoggedIn ? (
                <Button
                  type="button"
                  onClick={() => setIsCoinModalOpen(true)}
                  className="h-11 w-full rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Kredi Satın Al
                </Button>
              ) : (
                <NavLink to="/login" state={{ mode: "login", redirectTo }} onClick={() => setPostLoginRedirect(redirectTo)}>
                  <Button className="h-11 w-full rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700">
                    Giriş Yap ve Başla
                  </Button>
                </NavLink>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <article
                key={fact.title}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {fact.title}
                </p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {fact.value}
                </p>
                <p className="mt-1 text-sm text-gray-600">{fact.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              5 Adımda Tüm Süreç
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray-600">
              Buradaki akış, platformu sıfırdan kullanan birinin en kısa yoldan
              sınava girip sonucunu alması için tasarlandı.
            </p>
          </div>

          <div className="space-y-4">
            {PROCESS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-lg font-bold text-red-600">
                        {step.id}
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                        {step.description}
                      </p>

                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {step.points.map((point) => (
                          <div
                            key={point}
                            className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                          >
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Bölümlere Göre Değerlendirme
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-base leading-relaxed text-gray-600">
              Her bölüm ayrı beceriyi ölçer. Sonuç ekranında hem puan hem de
              seviyene karşılık gelen yorumları görebilirsin.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {SKILL_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${card.colorClass}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {card.title}
                      </h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">
                        {card.detail}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                          {card.duration}
                        </span>
                        <span className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                          {card.output}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Güvenli Hesap</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Giriş yaptığında profil bilgilerin korunur ve geçmiş sonuçların
              hesabında kalır.
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
              <Coins className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Esnek Kredi Kullanımı
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              İstersen tek bölüm, istersen tüm bölümler için kredi kullanarak
              kendi çalışma planına göre ilerleyebilirsin.
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600">
              <HelpCircle className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Destek Süreci</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Takıldığın noktada destek ekibine ulaşabilir, sınav akışı ve hesap
              süreçleri hakkında hızlıca yardım alabilirsin.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Sık Sorulan Sorular
          </h2>
          <div className="mt-8 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <article
                key={item.q}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-base font-semibold text-gray-900 md:text-lg">
                  {item.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 md:text-base">
                  {item.a}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-red-600 py-20">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-white blur-3xl" />
          <div className="absolute -bottom-20 left-0 h-64 w-64 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
            Hazırsan Sınava Geçebilirsin
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-red-50 md:text-lg">
            Artık tüm adımları biliyorsun. Hedef seviyeni görmek için hemen
            teste başla.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <NavLink to="/test">
              <Button className="h-12 rounded-xl bg-white px-8 text-base font-semibold text-red-600 hover:bg-red-50">
                Teste Başla
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </NavLink>
            <NavLink to="/#contact">
              <Button
                variant="outline"
                className="h-12 rounded-xl border-red-200 bg-transparent px-8 text-base font-semibold text-white hover:bg-red-700"
              >
                Destek Al
              </Button>
            </NavLink>
          </div>
        </div>
      </section>

      <PaymeCheckoutModal
        isOpen={isCoinModalOpen}
        onClose={() => setIsCoinModalOpen(false)}
        planName="Kredi Satın Al"
        planId="quick"
      />
    </div>
  );
};

export default HowItWorksPage;
