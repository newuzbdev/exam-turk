import { useState } from "react";
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


          {/* Small conceptual overview */}

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
