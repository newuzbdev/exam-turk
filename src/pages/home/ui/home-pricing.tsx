import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Coins, TrendingUp } from "lucide-react";

const HomePricing = () => {
  return (
    <div>
      <section
        id="pricing"
        className="py-24 bg-white border-t border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with highlight card under title */}
          <div className="max-w-3xl mx-auto text-center mb-16">
            <Badge className="mb-4 bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-3 py-1 text-xs font-medium tracking-wide">
              <TrendingUp className="h-4 w-4 mr-1.5" />
              Fiyatlandırma
            </Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
              Basit ve <span className="text-gray-900 underline decoration-sky-400 underline-offset-4">şeffaf</span> ücretlendirme
            </h2>
            <p className="text-sm md:text-base text-gray-500">
              Aylık abonelik yok, karmaşık paketler yok. Yalnızca çözdüğünüz
              deneme sınavları için ödeme yaparsınız.
            </p>

            {/* Highlight card directly under heading */}
            <Card className="mt-7 border border-gray-100 shadow-sm bg-white rounded-2xl">
              <CardContent className="px-6 py-5 md:px-8 md:py-6">
                <p className="text-base md:text-lg text-gray-800 mb-2 leading-relaxed">
                  TurkTest&apos;te{" "}
                  <span className="font-semibold text-gray-900">abonelik yok</span>,{" "}
                  <span className="font-semibold text-gray-900">gizli ücret yok</span>. Ne kadar
                  deneme çözerseniz, sadece onun için U birimi harcarsınız.
                </p>
                <p className="text-sm md:text-base text-gray-600 leading-relaxed">
                  Okuma, Dinleme, Yazma ve Konuşma denemelerini tek tek veya tam paket
                  olarak çözebilir, bakiyenizi istediğiniz zaman Payme ile güvenli
                  bir şekilde yükleyebilirsiniz.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Small conceptual overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
            {/* U Birimi card */}
            <Card className="group border border-gray-100 bg-white hover:bg-gray-50/60 shadow-sm rounded-2xl transition-colors duration-150">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-sky-600 border border-gray-200">
                    <Coins className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-[0.14em]">
                    U Birimi Nedir?
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Her deneme sınavı için kullanılan dijital{" "}
                  <span className="font-semibold">kredidir</span>. Hesabınıza U
                  yükleyerek Okuma, Dinleme, Yazma ve Konuşma denemelerini düzenli
                  ve kontrollü bir şekilde çözebilirsiniz.
                </p>
              </CardContent>
            </Card>

            {/* Esnek Kullanım card */}
            <Card className="group border border-gray-100 bg-white hover:bg-gray-50/60 shadow-sm rounded-2xl transition-colors duration-150">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-sky-600 border border-gray-200">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-[0.14em]">
                    Esnek Kullanım
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Her beceri için genellikle yalnızca birkaç U yeterlidir. Tam bir
                  deneme için toplam kaç U gerektiğini fiyatlar sayfasında{" "}
                  <span className="font-semibold">açık ve şeffaf</span> şekilde
                  görebilirsiniz.
                </p>
              </CardContent>
            </Card>

            {/* İlk Giriş Avantajı card */}
            <Card className="group border border-gray-100 bg-white hover:bg-gray-50/60 shadow-sm rounded-2xl transition-colors duration-150">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50 text-sky-600 border border-gray-200">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <span className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-[0.14em]">
                    İlk Giriş Avantajı
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Yeni kayıt olan kullanıcılara{" "}
                  <span className="font-semibold">başlangıç U bakiyesi</span> hediye
                  edilir. Böylece sistemi risksiz deneyebilir, ihtiyacınıza göre
                  daha sonra istediğiniz kadar bakiye yükleyebilirsiniz.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info text about detailed pricing (CTA button removed by request) */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs md:text-sm text-gray-500 leading-relaxed">
              Detaylı U birimi fiyatlarını, test başına ortalama maliyetleri ve
              Payme ile ödeme seçeneklerini Fiyatlar sayfasında
              inceleyebilirsiniz.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePricing;
