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
    <section id="contact" className="py-20 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Telegram / Hızlı Destek Barı */}
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-white border-2 border-red-500 p-8 sm:p-10 shadow-xl transition-transform hover:scale-[1.005] duration-300">

            {/* Arka plan dekoru (Hafif Kırmızı Blur) */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-red-100 opacity-50 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-red-100 opacity-50 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">

              {/* Sol Taraf: Metin */}
              <div className="text-center md:text-left text-gray-900 md:w-1/2">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                  <div className="p-2.5 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <h4 className="font-bold text-xl tracking-tight">Yardıma mı ihtiyacınız var?</h4>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed font-medium pl-1">
                  Ödeme, paketler veya teknik konularla ilgili sorularınızı direkt buradan yazabilirsiniz. Yöneticilerimiz anında yanıtlayacaktır.
                </p>
              </div>

              {/* Sağ Taraf: Input */}
              <div className="w-full md:w-1/2">
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-full p-1.5 pl-5 focus-within:border-red-500 focus-within:ring-4 focus-within:ring-red-500/20 transition-all duration-300">
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
                    className="flex-shrink-0 w-11 h-11 bg-red-600 rounded-full flex items-center justify-center text-white transition-all hover:bg-red-700 disabled:opacity-70 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shadow-md"
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
