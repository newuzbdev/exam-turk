import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "TURKISHMOCK resmi bir sınav yerine geçiyor mu?",
    answer:
      "Hayır. TURKISHMOCK, CEFR ve TYS gibi resmi sınavlara hazırlık için tasarlanmış yapay zekâ destekli bir deneme sınav platformudur.",
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
    <section className="py-24 bg-white font-sans border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white mb-6 shadow-sm">
            <HelpCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">Yardım Merkezi</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-black mb-4 tracking-tight">
            Sıkça Sorulan Sorular
          </h2>
          <p className="text-gray-500 font-medium">
            Merak ettiğiniz tüm detaylar burada
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`group rounded-2xl border transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-white border-red-200 shadow-lg ring-1 ring-red-50"
                    : "bg-gray-50 border-gray-100 hover:bg-white hover:border-gray-200"
                }`}
              >
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
                >
                  <span
                    className={`font-bold text-lg pr-8 transition-colors duration-300 ${
                      isOpen ? "text-gray-900" : "text-gray-700 group-hover:text-gray-900"
                    }`}
                  >
                    {item.question}
                  </span>

                  {/* İkon Kutusu */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen ? "bg-red-600 text-white rotate-180" : "bg-white text-gray-400 border border-gray-200 group-hover:border-red-200 group-hover:text-red-500"
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {/* Cevap Alanı (Basit Animasyon) */}
                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="px-6 pb-6 pt-0">
                    <p className="text-gray-600 leading-relaxed font-medium">
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
