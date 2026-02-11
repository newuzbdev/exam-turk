import { useState } from "react";
import { toast } from "@/utils/toast";
import { Send, AlertCircle } from "lucide-react";

// Telegram config
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID;

const HomePricing = () => {
  const [pricingMessage, setPricingMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // --- Telegram Gönderme Fonksiyonu ---
  const handleSendFromPricing = async () => {
    if (!pricingMessage.trim()) return;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      toast.error("İletişim sistemi şu an aktif değil.");
      return;
    }

    try {
      setIsSending(true);
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: `💬 Destek Sorusu:\n${pricingMessage}`,
        }),
      });

      if (!res.ok) throw new Error("Gönderim hatası");

      setPricingMessage("");
      toast.success("Mesajınız iletildi. En kısa sürede döneceğiz.");
    } catch (e) {
      console.error("Telegram error", e);
      toast.error("Mesaj gönderilemedi.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section id="contact" className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Telegram / Hızlı Destek Barı */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-7 sm:p-8 shadow-sm">

            {/* Arka plan dekoru (Hafif Kırmızı Blur) */}
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-red-50 opacity-70 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">

              {/* Sol Taraf: Metin */}
              <div className="text-center md:text-left text-gray-900 md:w-1/2">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2.5">
                  <div className="p-2.5 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-lg sm:text-xl tracking-tight">Yardıma mı ihtiyacınız var?</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed pl-1">
                  Ödeme, kredi satın alma ve teknik konularla ilgili sorularınızı buradan iletebilirsiniz. Test sırasında bir sorun yaşadıysanız detayları yazın; uygun durumlarda test hakkınız yeniden tanımlanabilir. Yöneticilerimiz en kısa sürede yanıt verir.
                </p>
              </div>

              {/* Sağ Taraf: Input */}
              <div className="w-full md:w-1/2">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full p-1.5 pl-5 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20 transition-all duration-300">
                  <input
                    type="text"
                    placeholder="Sorunuzu buraya yazın..."
                    className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm outline-none font-medium py-2"
                    value={pricingMessage}
                    onChange={(e) => setPricingMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendFromPricing()}
                  />
                  <button
                    onClick={handleSendFromPricing}
                    disabled={isSending || !pricingMessage.trim()}
                    className="flex-shrink-0 w-11 h-11 bg-red-600 rounded-full flex items-center justify-center text-white transition-colors hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomePricing;


