import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Coins, TrendingUp } from "lucide-react";
import { toast } from "@/utils/toast";

// Telegram config only from env
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const HomePricing = () => {
  const [pricingMessage, setPricingMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_success, setSuccess] = useState(false);

  const handleSendFromPricing = async () => {
    if (!pricingMessage.trim()) return;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      setError(
        "Telegram konfiguratsiyasi mavjud emas. Bu haqda tizim administratoriga xabar bering."
      );
      toast.error(
        "Telegram yapılandırması eksik. Lütfen sistem yöneticisine bildirin."
      );
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setSuccess(false);

      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `Narxlar bo'limidan yangi savol:\n${pricingMessage}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Telegram isteği başarısız oldu");
      }

      setPricingMessage("");
      setSuccess(true);
      toast.success("Mesajınız gönderildi.");
    } catch (e) {
      console.error("Pricing Telegram send error", e);
      setError("Xabar yuborilmadi, iltimos qayta urinib ko'ring.");
       toast.error(
        "Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setIsSending(false);
    }
  };

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

          {/* Info text about detailed pricing + Telegram quick question input */}
          <div className="max-w-7xl mx-auto text-center">
          
            {/* Red telegram bar directly under pricing text */}
            <div className="rounded-2xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-4 sm:px-6 sm:py-5 text-white shadow-md inline-block w-full">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs sm:text-sm font-medium text-left sm:pr-4">
                  Testle ilgili herhangi bir zorlukla karşılaşırsanız veya sorularınız varsa lütfen yöneticilerimizle şu adresten iletişime geçin:
                </p>
                <div className="mt-1 w-full sm:w-auto sm:min-w-[320px] flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Sorunuzu buraya yazın..."
                    className="w-full rounded-full border border-red-200 bg-white/95 px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-red-300 outline-none focus:border-white focus:ring-2 focus:ring-white"
                    value={pricingMessage}
                    onChange={(e) => setPricingMessage(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSendFromPricing}
                    disabled={isSending || !pricingMessage.trim()}
                    className="inline-flex shrink-0 items-center justify-center cursor-pointer rounded-full bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 shadow-md transition hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-red-200 disabled:text-white"
                  >
                    {isSending ? "Gönderiliyor..." : "Gönder"}
                  </button>
                </div>
              </div>
              <div className="mt-1 min-h-[1.25rem] text-[11px] text-left">
                {error && <span className="text-red-50">{error}</span>}
             
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePricing;
