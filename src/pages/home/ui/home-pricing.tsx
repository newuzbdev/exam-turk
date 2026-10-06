import { TelegramIcon } from "@/components/icons/telegram-icon";
import { tm } from "@/components/tm";
import { SUPPORT_TELEGRAM_URL } from "@/config/support";

const HomePricing = () => {
  return (
    <section id="contact" className={tm.section}>
      <div className={tm.container}>

        {/* Telegram / Hızlı Destek Barı */}
        <div className="mx-auto max-w-4xl border-y border-[var(--tm-border-subtle)] py-6">
          <div className="grid items-center gap-5 md:grid-cols-[0.8fr_1.2fr]">

              {/* Sol Taraf: Metin */}
              <div className="text-center text-[var(--tm-text-primary)] md:text-left">
                <div className="mb-3 flex items-center justify-center gap-3 md:justify-start">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center">
                    <img
                      src="/icons/turkishmock/help.svg"
                      alt=""
                      aria-hidden="true"
                      className="h-10 w-10 object-contain"
                    />
                  </span>
                  <h4 className="text-base font-semibold tracking-tight sm:text-lg">Yardıma mı ihtiyacınız var?</h4>
                </div>
                <p className="text-sm leading-6 text-[var(--tm-text-secondary)]">
                  Ödeme, üyelik veya teknik konularda bize Telegram’dan ulaşın.
                  Ekibimiz en kısa sürede dönüş yapar.
                </p>
              </div>

              <div className="flex w-full justify-center md:justify-end">
                <a
                  href={SUPPORT_TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[var(--tm-accent)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--tm-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tm-focus)]"
                >
                  <TelegramIcon className="h-4 w-4" aria-hidden="true" />
                  Telegram’dan yaz
                </a>
              </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomePricing;


