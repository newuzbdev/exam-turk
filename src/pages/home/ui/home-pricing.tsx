import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Coins, TrendingUp } from "lucide-react";

const HomePricing = () => {
  return (
    <div>
      <section id="pricing" className="py-24 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with highlight card under title */}
          <div className="max-w-3xl mx-auto text-center mb-14">
            <Badge className="mb-4 bg-red-100 text-red-700 border-red-200">
              <TrendingUp className="h-4 w-4 mr-2" />
              Fiyatlandırma
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Basit ve Şeffaf Ücretlendirme
            </h2>

            {/* Highlight card directly under heading */}
            <Card className="border-gray-100 shadow-sm bg-white/80">
              <CardContent className="px-6 py-5 md:px-8">
                <p className="text-base md:text-lg text-gray-700 mb-2">
                  TurkTest&apos;te{" "}
                  <span className="font-semibold">abonelik yo‘q</span>,{" "}
                  <span className="font-semibold">gizli ücret yo‘q</span>. Yalnızca
                  çözdüğünüz deneme imtihonlar uchun U birimi harcarsiz.
                </p>
                <p className="text-sm md:text-base text-gray-500">
                  Her beceri uchun alohida yoki tam imtihon paketi sifatida to‘lash
                  mumkin, bakiyenizi dilediğiniz vaqt Payme bilan ishonch bilan
                  yuklashingiz mumkin.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Small conceptual overview */}
          <div className="grid md:grid-cols-3 gap-5 mb-10">
            {/* U Birimi card */}
            <Card className="border-gray-100 shadow-sm bg-red-50/60">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    U Birimi Nedir?
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Her deneme imtihon uchun ishlatiladigan{" "}
                  <span className="font-semibold">sanal birim</span>dir. Hisobingizga
                  U yuklab, Dinleme, Okuma, Yazma ve Konuşma testlaringizni
                  bemalol va tartibli tarzda olishingiz mumkin.
                </p>
              </CardContent>
            </Card>

            {/* Esnek Kullanım card */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Esnek Kullanım
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Har bir beceri uchun odatda faqat bir necha U harcanadi. Tam bir
                  imtihon uchun toplam U ehtiyojini narx sahifasida{" "}
                  <span className="font-semibold">aniq va shaffof</span> tarzda
                  ko‘rishingiz mumkin.
                </p>
              </CardContent>
            </Card>

            {/* İlk Giriş Avantajı card */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    İlk Giriş Avantajı
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  Yangi qayd bo‘lgan foydalanuvchilar uchun{" "}
                  <span className="font-semibold">bepul boshlang‘ich U birimi</span>{" "}
                  beriladi. Shu bilan tizimni risksiz sinab ko‘rib, keyin
                  ehtiyojingizga qarab istalgan payt bakiye yuklashingiz
                  mumkin.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info text about detailed pricing (CTA button removed by request) */}
          <div className="max-w-3xl mx-auto text-center mt-10">
            <p className="text-sm text-gray-500">
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
