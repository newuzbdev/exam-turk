import { Card, CardContent } from "@/components/ui/card";
import { Quote, Star } from "lucide-react";

const HomeTestimonials = () => {
  const testimonials = [
    {
      name: "Ahmet Yılmaz",
      role: "Öğretmen",
      level: "B2",
      text: "TURKISHMOCK sayesinde Türkçe seviyemi doğru şekilde belirledim. Test sonuçları çok detaylı ve profesyonel.",
    },
    {
      name: "Fatma Demir",
      role: "Mühendis",
      level: "C1",
      text: "Konuşma testi özellikle çok başarılı. Telaffuzumu geliştirmek için aldığım geri bildirimler eksiklerimi görmemi sağladı.",
    },
    {
      name: "Mehmet Özkan",
      role: "Öğrenci",
      level: "A2",
      text: "Kullanıcı dostu arayüz ve kapsamlı test içeriği. Sınava hazırlanırken en büyük yardımcım oldu.",
    }
  ];

  return (
    <section className="py-24 bg-white font-sans border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header - Yıldızlı Rozet Eklendi */}
        <div className="text-center max-w-3xl mx-auto mb-16">

          {/* Yıldız Rozeti */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 bg-white mb-6 shadow-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-gray-900 tracking-tight">Yorumlar</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-black mb-4 tracking-tight">
            Kullanıcı Deneyimleri
          </h2>
          <p className="text-gray-500 font-medium">
            Platformu deneyimleyenlerin görüşleri
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, index) => (
            <Card
              key={index}
              className="relative bg-white border border-gray-200 rounded-2xl shadow-sm transition-all duration-300 hover:shadow-xl hover:border-gray-300 hover:-translate-y-1 group"
            >
              <CardContent className="p-8 flex flex-col h-full">

                {/* Dekoratif Tırnak İşareti - Hover'da Kırmızı */}
                <Quote className="mb-6 h-8 w-8 text-gray-200 transition-colors duration-300 group-hover:text-red-600" />

                {/* Yorum Metni */}
                <blockquote className="text-gray-800 text-base leading-relaxed flex-grow font-medium">
                  "{item.text}"
                </blockquote>

                {/* Footer Bilgisi */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center flex-wrap gap-2 mb-0.5">
                    <h4 className="font-bold text-black text-sm">{item.name}</h4>

                    {/* Ayırıcı Nokta */}
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>

                    {/* Seviye Bilgisi */}
                    <span className="text-xs font-bold text-black tracking-wide">
                      SEVİYE {item.level}
                    </span>
                  </div>

                  {/* Meslek */}
                  <div className="text-xs text-gray-400 font-medium">
                    {item.role}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeTestimonials;
