import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
      "Evet. Tüm test geçmişiniz, seviyeleriniz ve puanlarınız hesabınızda saklanır.",
  },
  {
    question: "Testi bitirdikten sonra sonuçları hemen görebilir miyim?",
    answer:
      "Evet. Sonuçlar anında değerlendirilir ve seviyeniz hemen gösterilir.",
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
    <section className="py-16 sm:py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title */}
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-12 font-serif">
          Sıkça Sorulan Sorular
        </h2>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
              >
                <span
                  className={`font-medium text-base pr-4 flex-1 ${
                    openIndex === index ? "text-red-500" : "text-black"
                  }`}
                >
                  {item.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                    openIndex === index ? "transform rotate-180" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5 pt-0">
                  <p className="text-gray-700 text-base leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeFAQ;

