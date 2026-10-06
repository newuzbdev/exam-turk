import { useState } from "react";
import { Plus } from "lucide-react";
import { tm } from "@/components/tm";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "TURKISHMOCK resmi bir sınav yerine geçiyor mu?",
    answer:
      "Hayır. TURKISHMOCK resmî bir sınav değildir ve sertifika vermez. CEFR düzeylerine göre Türkçe sınavına hazırlanmak için tasarlanmış yapay zekâ destekli bir deneme sınav platformudur.",
  },
  {
    question: "Telefon veya tablet üzerinden test çözebilir miyim?",
    answer:
      "Evet. TURKISHMOCK tüm modern mobil cihazlarda sorunsuz çalışır. Telefon, tablet veya bilgisayar üzerinden test çözebilirsiniz.",
  },
  {
    question: "Kullanıcı hesabımla ilerlemem kayıt altında tutuluyor mu?",
    answer:
      "Evet. Tüm test geçmişiniz, seviyeleriniz ve puanlarınız hesabınızda saklanır. Gelişiminizi profilinizden takip edebilirsiniz.",
  },
  {
    question: "Testi bitirdikten sonra sonuçları hemen görebilir miyim?",
    answer:
      "Evet. Sonuçlar anında değerlendirilir ve seviyeniz hemen gösterilir. Bekleme süresi yoktur.",
  },
  {
    question: "Test sırasında teknik bir sorun yaşarsam ne yapmalıyım?",
    answer:
      "Herhangi bir teknik sorun yaşarsanız bizimle iletişime geçebilirsiniz. Gerekirse test hakkınız yeniden tanımlanabilir.",
  },
];

const HomeFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="sss" className={tm.section}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-[var(--tm-text-primary)] sm:text-4xl">
          Sıkça sorulan sorular
        </h2>

        <div className="border-t border-[var(--tm-border-subtle)]">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="group overflow-hidden border-b border-[var(--tm-border-subtle)]"
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-5 text-left transition-colors duration-200 hover:bg-[var(--tm-bg-hover)] focus:outline-none focus-visible:bg-[var(--tm-bg-hover)] focus-visible:ring-2 focus-visible:ring-[var(--tm-focus)]"
                >
                  <span
                    className="pr-8 text-base font-medium text-[var(--tm-text-primary)] transition-colors duration-300 sm:text-lg"
                  >
                    {item.question}
                  </span>

                  <div className={`flex-shrink-0 text-[var(--tm-text-primary)] transition-all duration-200 ${
                    isOpen ? "rotate-45" : ""
                  }`}>
                    <Plus className="h-5 w-5" strokeWidth={2.2} />
                  </div>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-3 pb-5 pt-0">
                    <p className="max-w-3xl text-sm font-normal leading-7 text-[var(--tm-text-secondary)] sm:text-[15px]">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default HomeFAQ;

